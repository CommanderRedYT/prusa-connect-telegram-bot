import express from 'express';

import { deleteUser, listSubscriptions, listUsers } from '@/store';

const app = express();

app.get('/users', async (req, res) => {
    const users = await listUsers();
    res.json(users);
});

app.get('/delete/:chatId', async (req, res) => {
    const { chatId } = req.params;

    if (!chatId) {
        res.status(400).send('Invalid chatId');
        return;
    }

    if (!(await deleteUser(chatId))) {
        res.status(500).send('Failed to delete user');
        return;
    }

    res.sendStatus(200);
});

app.get('/subscriptions', async (req, res) => {
    const subscriptions = await listSubscriptions();

    res.json(subscriptions);
});

export default app;
