import dedent from 'dedent-js';
import moment from 'moment';

import {
    addTemporarySilentForUser,
    pushRegisteredCommands,
    registerCommand,
    registerHelpCommand,
    registerUnknownCommandHandler,
} from '@/bot';
import { getPreviewData, getPrinterStates } from '@/prusa';
import {
    addUserEntry,
    listSubscriptions,
    subscribeToPrinter,
    unsubscribeFromPrinter,
    verifyUser,
} from '@/store';
import { jobInfoStateToString } from '@/types/prusa';

const registerCommands = async (): Promise<boolean> => {
    console.info('Registering commands');

    registerCommand({
        name: 'start',
        description: 'Start the bot',
        handler: (bot, msg) => {
            bot.sendMessage(
                msg.chat.id,
                'Hello! Do I know you? If so, please use the /login command.',
            );

            addUserEntry(msg);
        },
    });

    registerCommand({
        name: 'login',
        description: 'Authenticate with the bot',
        args: [{ name: 'token', description: 'Your API token' }],
        handler: async (bot, msg, args) => {
            const token = args[0];

            const result = await verifyUser(msg.chat.id, token);

            if (result) {
                await bot.sendMessage(msg.chat.id, 'You are authenticated!');
            } else {
                await bot.sendMessage(msg.chat.id, 'Invalid token');
            }
        },
    });

    registerCommand({
        name: 'printers',
        description: 'List all printers',
        requiresAuth: true,
        handler: async (bot, msg) => {
            const printers = Object.values(getPrinterStates());

            const printerNames = printers.map(
                printer => `- ${printer.name} (${printer.printer_type_name})`,
            );

            const response = printerNames.join('\n');

            if (!response) {
                await bot.sendMessage(msg.chat.id, 'No printers found');
                return;
            }

            await bot.sendMessage(msg.chat.id, response);
        },
    });

    registerCommand({
        name: 'subscribe',
        description: 'Subscribe to printer updates',
        requiresAuth: true,
        handler: async (bot, msg) => {
            const printers = Object.values(getPrinterStates());
            const subscriptions = await listSubscriptions();

            const filteredPrinters = printers.filter(
                printer =>
                    !subscriptions.find(sub => sub.printer_id === printer.uuid),
            );

            const names = Array.from(
                new Set(filteredPrinters.map(printer => printer.name)),
            );

            if (!names.length) {
                await bot.sendMessage(
                    msg.chat.id,
                    'You are already subscribed to all printers.',
                );

                return null;
            }

            // create a menu with all printer names
            const keyboard = {
                reply_markup: {
                    keyboard: names.map(name => [{ text: name }]),
                    one_time_keyboard: true,
                },
            };

            await bot.sendMessage(msg.chat.id, 'Choose a printer:', keyboard);

            return message => {
                const printer = printers.find(p => p.name === message.text);

                if (!printer) {
                    bot.sendMessage(
                        msg.chat.id,
                        'Invalid printer. Please try again.',
                        {
                            reply_markup: {
                                remove_keyboard: true,
                            },
                        },
                    );

                    return;
                }

                // subscribe to printer
                subscribeToPrinter(msg.chat.id, printer.uuid);
                bot.sendMessage(
                    msg.chat.id,
                    `Subscribed to printer ${printer.name}`,
                    {
                        reply_markup: {
                            remove_keyboard: true,
                        },
                    },
                );
            };
        },
    });

    registerCommand({
        name: 'unsubscribe',
        description: 'Unsubscribe from printer updates',
        requiresAuth: true,
        handler: async (bot, msg) => {
            const printers = Object.values(getPrinterStates());
            const subscriptions = await listSubscriptions();

            if (!subscriptions.length) {
                await bot.sendMessage(
                    msg.chat.id,
                    'You are not subscribed to any printers.',
                );

                return null;
            }

            const filteredPrinters = printers.filter(printer =>
                subscriptions.find(sub => sub.printer_id === printer.uuid),
            );

            const names = Array.from(
                new Set(filteredPrinters.map(printer => printer.name)),
            );

            if (!names.length) {
                await bot.sendMessage(
                    msg.chat.id,
                    'You are not subscribed to any printers.',
                );

                return null;
            }

            // create a menu with all printer names
            const keyboard = {
                reply_markup: {
                    keyboard: names.map(name => [{ text: name }]),
                    one_time_keyboard: true,
                },
            };

            await bot.sendMessage(msg.chat.id, 'Choose a printer:', keyboard);

            return message => {
                const printer = printers.find(p => p.name === message.text);

                if (!printer) {
                    bot.sendMessage(
                        msg.chat.id,
                        'Invalid printer. Please try again.',
                        {
                            reply_markup: {
                                remove_keyboard: true,
                            },
                        },
                    );

                    return;
                }

                // unsubscribe from printer
                unsubscribeFromPrinter(msg.chat.id, printer.uuid);
                bot.sendMessage(
                    msg.chat.id,
                    `Unsubscribed from printer ${printer.name}`,
                    {
                        reply_markup: {
                            remove_keyboard: true,
                        },
                    },
                );
            };
        },
    });

    registerCommand({
        name: 'subscriptions',
        description: 'List all subscriptions',
        requiresAuth: true,
        handler: async (bot, msg) => {
            const subscriptions = await listSubscriptions();
            const printers = Object.values(getPrinterStates());

            const response = subscriptions
                .map(sub => {
                    const printer = printers.find(
                        p => p.uuid === sub.printer_id,
                    );
                    return `- ${printer?.name} (${printer?.printer_type_name})`;
                })
                .join('\n');

            if (!response) {
                await bot.sendMessage(msg.chat.id, 'No subscriptions found');
                return;
            }

            await bot.sendMessage(msg.chat.id, response);
        },
    });

    registerCommand({
        name: 'job',
        description: 'Get the current job status',
        requiresAuth: true,
        handler: async (bot, msg) => {
            const printers = Object.values(getPrinterStates());

            const printersWithJobs = printers.filter(
                printer => printer.job_info,
            );

            // ask for printer
            const names = Array.from(
                new Set(printersWithJobs.map(printer => printer.name)),
            );

            if (!names.length) {
                await bot.sendMessage(msg.chat.id, 'No printers found');
                return null;
            }

            // create a menu with all printer names
            const keyboard = {
                reply_markup: {
                    keyboard: names.map(name => [{ text: name }]),
                    one_time_keyboard: true,
                },
            };

            await bot.sendMessage(msg.chat.id, 'Choose a printer:', keyboard);

            return async message => {
                const printer = printers.find(p => p.name === message.text);

                if (!printer) {
                    await bot.sendMessage(
                        msg.chat.id,
                        'Invalid printer. Please try again.',
                        {
                            reply_markup: {
                                remove_keyboard: true,
                            },
                        },
                    );

                    return;
                }

                if (!printer.job_info) {
                    await bot.sendMessage(msg.chat.id, 'No job found', {
                        reply_markup: {
                            remove_keyboard: true,
                        },
                    });
                    return;
                }

                const response = dedent`
                <b>Job status for ${printer.name}:</b>
                Printing ${printer.job_info.display_name}
                Status: ${jobInfoStateToString(printer.job_info.state)}
                Progress: ${printer.job_info.progress}%
                Printing since: ${moment().subtract(printer.job_info.time_printing, 'seconds').format('HH:mm:ss DD.MM.YYYY')}
                Estimated time remaining: ${moment.duration(printer.job_info.time_remaining, 'seconds').humanize()}
                Total time: ${moment.duration(printer.job_info.time_printing + printer.job_info.time_remaining, 'seconds').humanize()}
                `;

                const previewImageArrayBuffer = await getPreviewData(printer);

                const previewImageBuffer = Buffer.from(
                    previewImageArrayBuffer || new ArrayBuffer(0),
                );

                if (previewImageArrayBuffer) {
                    await bot.sendPhoto(
                        msg.chat.id,
                        previewImageBuffer,
                        {
                            caption: response,
                            parse_mode: 'HTML',
                            reply_markup: {
                                remove_keyboard: true,
                            },
                        },
                        { filename: 'preview.png' },
                    );
                } else {
                    await bot.sendMessage(msg.chat.id, response, {
                        parse_mode: 'HTML',
                        reply_markup: {
                            remove_keyboard: true,
                        },
                    });
                }
            };
        },
    });

    registerCommand({
        name: 'shutup',
        description: 'Disable notifications for a printer',
        requiresAuth: true,
        handler: async (bot, msg) => {
            const subscriptions = await listSubscriptions();
            const printers = Object.values(getPrinterStates());

            const filteredPrinters = printers.filter(printer =>
                subscriptions.find(sub => sub.printer_id === printer.uuid),
            );

            const names = Array.from(
                new Set(filteredPrinters.map(printer => printer.name)),
            );

            if (!names.length) {
                await bot.sendMessage(
                    msg.chat.id,
                    'You are not subscribed to any printers.',
                );

                return null;
            }

            // create a menu with all printer names
            const keyboard = {
                reply_markup: {
                    keyboard: [
                        ...names.map(name => [{ text: name }]),
                        [{ text: 'All printers' }],
                    ],
                    one_time_keyboard: true,
                },
            };

            await bot.sendMessage(msg.chat.id, 'Choose a printer:', keyboard);

            return message => {
                const printerOrPrinters =
                    message.text === 'All printers'
                        ? filteredPrinters
                        : printers.find(p => p.name === message.text);

                if (!printerOrPrinters) {
                    bot.sendMessage(
                        msg.chat.id,
                        'Invalid printer. Please try again.',
                        {
                            reply_markup: {
                                remove_keyboard: true,
                            },
                        },
                    );

                    return;
                }

                const printerIds = Array.isArray(printerOrPrinters)
                    ? printerOrPrinters.map(p => p.uuid)
                    : [printerOrPrinters.uuid];

                for (const printerId of printerIds) {
                    addTemporarySilentForUser(msg.chat.id, printerId);
                }
            };
        },
    });

    // helpers
    registerUnknownCommandHandler((bot, msg) => {
        bot.sendMessage(
            msg.chat.id,
            'Sorry, I do not understand this command. Try /help',
        );
    });

    registerHelpCommand();

    return pushRegisteredCommands();
};

export { registerCommands };
