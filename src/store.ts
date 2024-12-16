import type { ChatId, Message } from 'node-telegram-bot-api';
import { Database } from 'sqlite3';
import { v4 as uuid } from 'uuid';

import { inMinutes } from '@/utils';

const db = new Database('database.db');

export const initDatabase = (): void => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT NOT NULL,
            chat_id TEXT NOT NULL UNIQUE,
            auth_code TEXT,
            auth_code_valid_until TEXT,
            authed BOOLEAN DEFAULT 0,
            invalid_auth_attempts INTEGER DEFAULT 0,
            banned BOOLEAN DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT NOT NULL,
            chat_id TEXT NOT NULL,
            printer_id TEXT NOT NULL,
            PRIMARY KEY (chat_id, printer_id),
            FOREIGN KEY (chat_id) REFERENCES users (chat_id)
        );
    `);
};

export interface UsersItem {
    id: string;
    chat_id: ChatId;
    auth_code: string;
    auth_code_valid_until: string;
    authed: boolean;
    invalid_auth_attempts: number;
    banned: boolean;
}

export interface SubscriptionsItem {
    id: string;
    chat_id: ChatId;
    printer_id: string;
}

export const addUserEntry = (msg: Message): void => {
    db.run(
        `
        INSERT INTO users (id, chat_id, auth_code, auth_code_valid_until)
        VALUES ($id, $chat_id, $auth_code, $auth_code_valid_until)
        ON CONFLICT DO NOTHING;
    `,
        {
            $id: uuid(),
            $chat_id: msg.chat.id,
            $auth_code: uuid(),
            $auth_code_valid_until: inMinutes(5).toISOString(),
        },
    );
};

export const verifyUser = async (
    chatId: ChatId,
    authCode: string,
): Promise<boolean> => {
    if (!chatId || !authCode) {
        throw new Error('Invalid parameters');
    }

    return new Promise((resolve, reject) => {
        db.get(
            `
                SELECT *
                FROM users
                WHERE chat_id = $chat_id
                  AND auth_code = $auth_code AND invalid_auth_attempts < 3;
            `,
            {
                $chat_id: chatId,
                $auth_code: authCode,
            },
            (err, row: UsersItem | null) => {
                if (err) {
                    reject(err);
                }

                if (row) {
                    // get row and check if its code is still valid
                    const validUntil = new Date(row.auth_code_valid_until);

                    if (validUntil < new Date()) {
                        resolve(false);
                    }

                    db.run(
                        `
                            UPDATE users
                            SET authed = 1
                            WHERE chat_id = $chat_id;
                        `,
                        {
                            $chat_id: chatId,
                        },
                    );

                    resolve(true);
                } else {
                    db.run(
                        `
                            UPDATE users
                            SET invalid_auth_attempts = invalid_auth_attempts + 1
                            WHERE chat_id = $chat_id;
                        `,
                        {
                            $chat_id: chatId,
                        },
                    );

                    resolve(false);
                }

                resolve(false);
            },
        );
    });
};

export const isUserAuthed = (chatId: ChatId): Promise<boolean> =>
    new Promise((resolve, reject) => {
        db.get(
            `
                SELECT authed
                FROM users
                WHERE chat_id = $chat_id;
            `,
            {
                $chat_id: chatId,
            },
            (err, row: { authed: number } | null) => {
                if (err) {
                    reject(err);
                }

                resolve(!!row?.authed);
            },
        );
    });

export const banUser = (chatId: ChatId): void => {
    db.run(
        `
            UPDATE users
            SET banned = 1
            WHERE chat_id = $chat_id;

            DELETE
            FROM subscriptions
            WHERE chat_id = $chat_id;
        `,
        {
            $chat_id: chatId,
        },
    );
};

export const unbanUser = (chatId: ChatId): void => {
    db.run(
        `
            UPDATE users
            SET banned = 0
            WHERE chat_id = $chat_id;
        `,
        {
            $chat_id: chatId,
        },
    );
};

export const deleteUser = (chatId: ChatId): Promise<boolean> =>
    new Promise((resolve, reject) => {
        db.run(
            `
                DELETE
                FROM subscriptions
                WHERE chat_id = $chat_id;

                DELETE
                FROM users
                WHERE chat_id = $chat_id;
            `,
            {
                $chat_id: chatId,
            },
            err => {
                if (err) {
                    reject(err);
                }

                resolve(true);
            },
        );
    });

export interface ListUsersItem {
    chat_id: ChatId;
    authed: boolean;
    banned: boolean;
}

export const listUsers = (): Promise<ListUsersItem[]> =>
    new Promise((resolve, reject) => {
        db.all('SELECT * FROM users;', (err, rows) => {
            if (err) {
                reject(err);
            }

            resolve(rows as ListUsersItem[]);
        });
    });

export const listAuthedUsers = (): Promise<ListUsersItem[]> =>
    new Promise((resolve, reject) => {
        db.all('SELECT * FROM users WHERE authed = 1;', (err, rows) => {
            if (err) {
                reject(err);
            }

            resolve(rows as ListUsersItem[]);
        });
    });

export const subscribeToPrinter = (chatId: ChatId, printerId: string): void => {
    console.log('Subscribing to printer', chatId, printerId);

    db.run(
        `
            INSERT INTO subscriptions (id, chat_id, printer_id)
            VALUES ($id, $chat_id, $printer_id)
            ON CONFLICT DO NOTHING;
        `,
        {
            $id: uuid(),
            $chat_id: chatId,
            $printer_id: printerId,
        },
    );
};

export const unsubscribeFromPrinter = (
    chatId: ChatId,
    printerId: string,
): void => {
    db.run(
        `
            DELETE
            FROM subscriptions
            WHERE chat_id = $chat_id
              AND printer_id = $printer_id;
        `,
        {
            $chat_id: chatId,
            $printer_id: printerId,
        },
    );
};

export const listSubscriptions = (): Promise<
    { chat_id: ChatId; printer_id: string }[]
> =>
    new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM subscriptions;',
            (err, rows: { chat_id: ChatId; printer_id: string }[]) => {
                if (err) {
                    reject(err);
                }

                resolve(rows);
            },
        );
    });
