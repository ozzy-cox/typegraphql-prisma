import 'reflect-metadata'
import { ApolloServer } from "@apollo/server";
import Express from "express";
import { buildSchema } from "type-graphql";
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import cors from 'cors';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { Redis } from 'ioredis';
import http from "http"
import { expressMiddleware } from '@apollo/server/express4';
import { PrismaClient } from "@prisma/client";

import { resolvers } from "./prisma/generated/type-graphql";
import { customAuthChecker } from './auth-checker';
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from 'graphql-query-complexity';
import { CustomUserResolver } from './custom/user/Resolver';


(
    async function () {

        const prisma = new PrismaClient();
        await prisma.$connect();



        const redis = new Redis()


        const schema = await buildSchema({
            resolvers: [
                ...resolvers,
                CustomUserResolver
            ],
            authChecker: customAuthChecker,
            authMode: "null",
            // This is necessary for latest class validator version
            validate: { forbidUnknownValues: false },
            emitSchemaFile: "schema.gql",
            // Need this because somehow the response doesnt show validation error specifics
            globalMiddlewares: [
                async ({ context, info }, next) => {
                    try {
                        return await next();
                    } catch (err) {
                        // write error to file log
                        console.log(err);

                        // rethrow the error
                        throw err;
                    }
                }
            ]
        })

        const app = Express()
        const httpServer = http.createServer(app);

        const server = new ApolloServer({
            schema,
            plugins: [
                ApolloServerPluginDrainHttpServer({ httpServer }),
                {
                    requestDidStart: async () => ({
                        async didResolveOperation({ request, document }) {
                            /**
                             * This provides GraphQL query analysis to be able to react on complex queries to your GraphQL server.
                             * This can be used to protect your GraphQL servers against resource exhaustion and DoS attacks.
                             * More documentation can be found at https://github.com/ivome/graphql-query-complexity.
                             */
                            const complexity = getComplexity({
                                // Our built schema
                                schema,
                                // To calculate query complexity properly,
                                // we have to check only the requested operation
                                // not the whole document that may contains multiple operations
                                operationName: request.operationName,
                                // The GraphQL query document
                                query: document,
                                // The variables for our GraphQL query
                                variables: request.variables,
                                // Add any number of estimators. The estimators are invoked in order, the first
                                // numeric value that is being returned by an estimator is used as the field complexity.
                                // If no estimator returns a value, an exception is raised.
                                estimators: [
                                    // Using fieldExtensionsEstimator is mandatory to make it work with type-graphql.
                                    fieldExtensionsEstimator(),
                                    // Add more estimators here...
                                    // This will assign each field a complexity of 1
                                    // if no other estimator returned a value.
                                    simpleEstimator({ defaultComplexity: 1 }),
                                ],
                            });
                            // Here we can react to the calculated complexity,
                            // like compare it with max and throw error when the threshold is reached.
                            if (complexity > 100) {
                                throw new Error(
                                    `Sorry, too complicated query! ${complexity} is over 100 that is the max allowed complexity.`,
                                );
                            }
                            // And here we can e.g. subtract the complexity point from hourly API calls limit.
                            // FIXME This is being called constanly without a request 
                            // console.log("Used query complexity points:", complexity);
                        },
                    }),
                }

            ],

        })

        await server.start()

        // Session middleware needs to execute before apollo expressMiddleware
        app.use(
            session({
                store: new RedisStore({
                    client: redis as any
                }),
                name: "qid",
                secret: "eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81",
                resave: false,
                saveUninitialized: false,
                cookie: {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    maxAge: 1000 * 60 * 60 * 24 * 7 * 365 // 7 years
                }
            })
        );

        app.use(
            cors<cors.CorsRequest>({
                credentials: true,
                origin: "http://localhost:3000"
            }),
            Express.json(),
            expressMiddleware(server, {
                context: async () => ({ prisma }),
            }),
            expressMiddleware(server, {
                context: async ({ req }) => ({ req }),
            }),
        );


        app.listen(4000, () => {
            console.log('Server started on http://localhost:4000')
        })

    }
)()