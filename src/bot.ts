import type { ExtendedEnv } from '@/env';

import type { Stream } from 'node:stream';
import type {
    BotCommand,
    Message,
    SendMessageOptions,
    SendPhotoOptions,
} from 'node-telegram-bot-api';
import TelegramBot from 'node-telegram-bot-api';

import { isUserAuthed, listAuthedUsers, listSubscriptions } from '@/store';

const token = process.env
    .TELEGRAM_BOT_TOKEN as ExtendedEnv['TELEGRAM_BOT_TOKEN'];

const bot = new TelegramBot(token, {
    polling: true,
});

export type Bot = typeof bot;

export const commands: ExtendedBotCommand[] = [];

let pushed = false;

const answerCallbacks: Record<string, (msg: Message) => void> = {};

export type Command = {
    name: string;
    description: string;
    handler: (
        bot: Bot,
        msg: Message,
        args: string[],
        match: RegExpExecArray | null,
    ) =>
        | void
        | Promise<void>
        | (((msg: Message) => void) | null)
        | Promise<((msg: Message) => void) | null>;
    requiresAuth?: boolean;
    args?: {
        name: string;
        description: string;
    }[];
};

export type ExtendedBotCommand = BotCommand & Pick<Command, 'args'>;

export type RegisterCommand = (command: Command) => void;

export const registerCommand: RegisterCommand = command => {
    if (pushed) {
        throw new Error('Commands have already been pushed to the bot.');
    }

    const existingCommand = commands.find(c => c.command === command.name);

    if (existingCommand) {
        console.error(`Command ${command.name} is already registered.`);

        return;
    }

    if (command.name !== command.name.toLowerCase()) {
        console.warn(
            `Command names should be lowercase. Found: ${command.name}`,
        );
    }

    commands.push({
        command: command.name,
        description: command.description,
        args: command.args,
    });
    bot.onText(new RegExp(`^/${command.name}`), async (msg, match) => {
        const args = msg.text?.split(' ').slice(1) || [];

        const chatId = msg.chat.id;

        if (command.requiresAuth) {
            const verified = await isUserAuthed(chatId);

            if (!verified) {
                await bot.sendMessage(
                    chatId,
                    'You are not authenticated. Please use /login to authenticate.',
                );

                return;
            }
        }

        if (command.args && args.length !== command.args?.length) {
            await bot.sendMessage(
                msg.chat.id,
                'Invalid arguments. Try /help for more information.',
            );

            return;
        }

        try {
            const response = command.handler(bot, msg, args, match);

            // check if it needs to be awaited
            if (response instanceof Promise) {
                const awaited = await response;

                if (typeof awaited === 'function') {
                    answerCallbacks[msg.chat.id] = awaited;
                }
            } else if (typeof response === 'function') {
                answerCallbacks[msg.chat.id] = response;
            }
        } catch (error) {
            console.error(error);
        }
    });

    console.info('Registered command', `/${command.name}`);
};

export const registerUnknownCommandHandler = (
    handler: (bot: Bot, msg: Message) => void,
): void => {
    bot.addListener('message', msg => {
        const command = msg.text?.split(' ')[0];

        if (msg.chat.id in answerCallbacks) {
            answerCallbacks[msg.chat.id](msg);
            delete answerCallbacks[msg.chat.id];

            return;
        }

        if (command && !commands.some(c => c.command === command?.slice(1))) {
            handler(bot, msg);
        }
    });
};

const generateCommandHelp = (
    name: string,
    description: string,
    args: Command['args'],
): string => {
    const mappedArgs = args
        ? `Args:\n${args.map(arg => `  ${arg.name} - ${arg.description}`).join('\n')}\n`
        : '';

    const argStr = args ? args.map(arg => `<${arg.name}>`).join(' ') : '';

    return `/${name} ${argStr} - ${description}\n${mappedArgs}`;
};

export const registerHelpCommand = (): void => {
    registerCommand({
        name: 'help',
        description: 'Show help',
        handler: async (handlerBot, msg) => {
            const helpMessage = commands
                .map(command =>
                    generateCommandHelp(
                        command.command,
                        command.description,
                        command.args,
                    ),
                )
                .join('\n');

            await handlerBot.sendMessage(msg.chat.id, helpMessage);
        },
    });
};

/*
 * Push registered commands to the bot.
 * This function should be called after all commands are registered.
 */
export const pushRegisteredCommands = async (): Promise<boolean> => {
    const currentCommands = await bot.getMyCommands();

    if (currentCommands.length === commands.length) {
        if (
            currentCommands.every((command, index) => {
                const registeredCommand = commands[index];

                return (
                    command.command === registeredCommand.command &&
                    command.description === registeredCommand.description
                );
            })
        ) {
            pushed = true;

            return true;
        }
    }

    const response = await bot.setMyCommands(commands);

    if (response) {
        pushed = true;
    } else {
        console.warn('Failed to push commands to the bot.');
    }

    console.info('Pushed commands to Telegram API');

    return response;
};

export const debugLogger = (message: Message): void => {
    if (process.env.NODE_ENV === 'development') {
        console.error(`[BOT] ${JSON.stringify(message)}`);
    }
};

bot.addListener('message', (msg: Message) => {
    debugLogger(msg);
});

export const sendToAllAuthedUsers = async (
    message: string,
    options?: SendMessageOptions,
): Promise<void> => {
    const users = await listAuthedUsers();

    users.forEach(user => {
        bot.sendMessage(user.chat_id, message, options);
    });
};

export const sendToAllAuthedAndSubscribedUsers = async (
    message: string,
    options?: SendMessageOptions,
): Promise<void> => {
    const users = await listAuthedUsers();
    const subscriptions = await listSubscriptions();

    const subscribedUsers = users.filter(user =>
        subscriptions.some(sub => sub.chat_id === user.chat_id),
    );

    subscribedUsers.forEach(user => {
        bot.sendMessage(user.chat_id, message, options);
    });
};

export const sendMessageForSpecificPrinter = async (
    printerId: string,
    message: string,
    options?: SendMessageOptions,
): Promise<void> => {
    const subscriptions = await listSubscriptions();

    const subscribedUsers = subscriptions.filter(
        sub => sub.printer_id === printerId,
    );

    subscribedUsers.forEach(sub => {
        bot.sendMessage(sub.chat_id, message, options);
    });
};

export const sendPhotoForSpecificPrinter = async (
    printerId: string,
    photo: string | Stream | Buffer,
    options?: SendPhotoOptions,
): Promise<void> => {
    const subscriptions = await listSubscriptions();

    const subscribedUsers = subscriptions.filter(
        sub => sub.printer_id === printerId,
    );

    subscribedUsers.forEach(sub => {
        bot.sendPhoto(sub.chat_id, photo, options);
    });
};
