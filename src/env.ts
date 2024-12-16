import { configDotenv } from 'dotenv';

configDotenv();

export interface RequiredEnvVariable {
    name: string;
    type: 'string' | 'number' | 'boolean';
    or?: string;
}

const requiredEnvVariables: RequiredEnvVariable[] = [
    { name: 'TELEGRAM_BOT_TOKEN', type: 'string' },
    {
        name: 'PRUSA_CONNECT_USERNAME',
        type: 'string',
        or: 'PRUSA_CONNECT_COOKIE',
    },
    {
        name: 'PRUSA_CONNECT_PASSWORD',
        type: 'string',
        or: 'PRUSA_CONNECT_COOKIE',
    },
    {
        name: 'PRUSA_CONNECT_COOKIE',
        type: 'string',
    },
];

export interface ExtendedEnv {
    TELEGRAM_BOT_TOKEN: string;
}

const checkEnv = (envVariable: RequiredEnvVariable): void => {
    let orValid = false;
    if (envVariable.or) {
        try {
            const or = requiredEnvVariables.find(
                e => e.name === envVariable.or,
            );

            if (or) {
                checkEnv(or);

                orValid = true;
            }
        } catch {
            orValid = false;
        }
    }

    if (!process.env[envVariable.name]) {
        if (!orValid) {
            throw new Error(
                `Missing required environment variable: ${envVariable.name}`,
            );
        }

        return;
    }

    if (
        envVariable.type === 'number' &&
        Number.isNaN(Number(process.env[envVariable.name]))
    ) {
        throw new Error(
            `Environment variable ${envVariable.name} is not a number`,
        );
    }

    if (
        envVariable.type === 'boolean' &&
        process.env[envVariable.name] !== 'true' &&
        process.env[envVariable.name] !== 'false'
    ) {
        throw new Error(
            `Environment variable ${envVariable.name} is not a boolean`,
        );
    }

    console.info(`${envVariable.name} is okay`);
};

requiredEnvVariables.forEach(checkEnv);
