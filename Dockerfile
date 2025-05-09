FROM node:22-alpine AS base

RUN apk add --update --no-cache python3 py3-pip py3-setuptools make gcc g++

FROM base AS deps

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

FROM base AS runner

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

ENV NODE_ENV=production

CMD ["yarn", "start"]
