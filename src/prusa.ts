/* eslint-disable no-lonely-if */
import deepEqual from 'deep-equal';
import moment from 'moment';
import * as fs from 'node:fs';
import type { SendMessageOptions } from 'node-telegram-bot-api';

import { sendMessageForSpecificPrinter } from '@/bot';
import type { Printer, PrinterListResponse } from '@/types/prusa';

const BASE_PATH = 'https://connect.prusa3d.com';

const printerStates: Record<string, Printer> = {};

let previousPrinterStates: Record<string, Printer> = {};

const lastUpdates: Record<string, moment.Moment> = {};

const maximumTimeout = 1000 * 60 * 30; // 30 minutes
const minimumTimeout = 1000 * 30; // 30 seconds

const WRITE_DEBUG_FILES = process.env.WRITE_DEBUG_FILES === 'true';

const getHeaders = (): HeadersInit => {
    if (process.env.PRUSA_CONNECT_COOKIE) {
        // set the SESSID cookie
        return {
            Cookie: `SESSID=${process.env.PRUSA_CONNECT_COOKIE}`,
        };
    }
    throw new Error('Not implemented');
};

export const getPrintersWithPagination = async (
    offset: number,
): Promise<PrinterListResponse> => {
    const headers = getHeaders();
    const response = await fetch(`${BASE_PATH}/app/printers?offset=${offset}`, {
        headers,
    });
    return response.json();
};

export const getPrinters = async (): Promise<Printer[]> => {
    let offset = 0;

    const printers: Printer[] = [];

    let response = await getPrintersWithPagination(offset);

    while (response.printers.length) {
        printers.push(...response.printers);

        // eslint-disable-next-line no-await-in-loop
        response = await getPrintersWithPagination(offset);

        offset += response.pager.limit;

        if (response.pager.limit > response.pager.total) {
            break;
        }
    }

    return printers;
};

export const handleUpdates = async (): Promise<void> => {
    for await (const [printerId, printer] of Object.entries(printerStates)) {
        const previousPrinter = previousPrinterStates[printerId] as
            | Printer
            | undefined;

        if (!previousPrinter) {
            continue;
        }

        const isSame = deepEqual(printer, previousPrinter);

        if (isSame) {
            continue;
        }

        if (WRITE_DEBUG_FILES) {
            // ./${printerId}/${timestamp}.json
            const path = `./debug/${printerId}`;
            const timestamp = Date.now();

            if (!fs.existsSync(path)) {
                fs.mkdirSync(path, {
                    recursive: true,
                });
            }

            fs.writeFileSync(
                `${path}/${timestamp}.json`,
                JSON.stringify(printer, null, 2),
            );
        }

        if (printer.connect_state !== previousPrinter.connect_state) {
            const str = `Printer ${printer.name} state changed to ${printer.connect_state}`;

            await sendMessageForSpecificPrinter(printer.uuid, str);
        }

        // console.log('job_info', printer.job_info);

        if (printer.job_info) {
            const jobIsDone = printer.job_info.progress === 100;
            const lastUpdate = lastUpdates[printerId];
            const lastUpdateAgo = moment().diff(lastUpdate);

            let shouldNotify =
                !lastUpdate ||
                (lastUpdateAgo > maximumTimeout &&
                    lastUpdateAgo < minimumTimeout);

            if (
                printer.job_info.progress !==
                    previousPrinter.job_info?.progress &&
                lastUpdateAgo > minimumTimeout
            ) {
                shouldNotify = true;
            }

            if (shouldNotify) {
                lastUpdates[printerId] = moment();
            }

            // bind sendMessageForSpecificPrinter to printerId and also early return if we should not notify
            const sendMessage = async (
                message: string,
                options?: SendMessageOptions,
            ): Promise<void> => {
                if (!shouldNotify) {
                    const willNotifyIn = maximumTimeout - lastUpdateAgo;
                    const formattedTime = moment
                        .duration(willNotifyIn, 'milliseconds')
                        .humanize();
                    console.info(
                        `Not notifying for printer ${printer.name}, will notify again in (latest time possible) ${formattedTime}`,
                    );
                    return;
                }

                await sendMessageForSpecificPrinter(
                    printerId,
                    message,
                    options,
                );
            };

            if (jobIsDone) {
                // job is done
                console.log('job is done for printer', printer.name);
                if (previousPrinter.job_info?.progress !== 100) {
                    const str = `Print job on ${printer.name} is done!`;

                    await sendMessageForSpecificPrinter(printer.uuid, str);
                }
            } else {
                // job still running
                console.log('job is still running for printer', printer.name);

                let timeRemaining = '';

                if (printer.job_info.time_remaining !== -1) {
                    const duration = moment.duration(
                        printer.job_info.time_remaining,
                        'seconds',
                    );
                    const formattedTime = duration.humanize();

                    // for doneAt, use calendar
                    const doneAt = moment().add(duration).calendar({
                        sameDay: '[today at] HH:mm',
                        nextDay: '[tomorrow at] HH:mm',
                        nextWeek: 'dddd [at] HH:mm',
                        lastDay: '[yesterday at] HH:mm',
                        lastWeek: '[last] dddd [at] HH:mm',
                        sameElse: 'DD.MM.YYYY [at] HH:mm',
                    });

                    timeRemaining = ` (${formattedTime} remaining, ${doneAt})`;
                }

                const str = `Print job on ${printer.name} is now at ${printer.job_info.progress}%${timeRemaining}`;

                await sendMessage(str);
            }
        }
    }
};

export const handlePolling = async (): Promise<void> => {
    const printers = await getPrinters();

    previousPrinterStates = { ...printerStates };

    for (const printer of printers) {
        printerStates[printer.uuid] = printer;
    }

    await handleUpdates();
};

let pollingInterval: NodeJS.Timeout;

export const startPolling = (): void => {
    pollingInterval = setInterval(handlePolling, 10000);
    handlePolling();
};

export const stopPolling = (): void => {
    clearInterval(pollingInterval);
};

export const getPrinterState = (printerId: string): Printer =>
    printerStates[printerId];

export const getPrinterStates = (): Record<string, Printer> => printerStates;
