import {
    pushRegisteredCommands,
    registerCommand,
    registerHelpCommand,
    registerUnknownCommandHandler,
} from '@/bot';
import { getPrinterStates } from '@/prusa';
import {
    addUserEntry,
    listSubscriptions,
    subscribeToPrinter,
    unsubscribeFromPrinter,
    verifyUser,
} from '@/store';

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

            await bot.sendMessage(msg.chat.id, response, {
                parse_mode: 'Markdown',
            });
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
                    );

                    return;
                }

                // subscribe to printer
                subscribeToPrinter(msg.chat.id, printer.uuid);
                bot.sendMessage(
                    msg.chat.id,
                    `Subscribed to printer ${printer.name}`,
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
                    );

                    return;
                }

                // unsubscribe from printer
                unsubscribeFromPrinter(msg.chat.id, printer.uuid);
                bot.sendMessage(
                    msg.chat.id,
                    `Unsubscribed from printer ${printer.name}`,
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

            await bot.sendMessage(msg.chat.id, response, {
                parse_mode: 'Markdown',
            });
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
