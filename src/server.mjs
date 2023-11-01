import { IncomingMessage, createServer } from 'http'
import { URL } from 'url'
import next from 'next'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import { PubSub } from 'graphql-subscriptions'
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const pubsub = new PubSub();

// A number that we'll increment over time to simulate subscription events
let currentNumber = 0;

// Schema definition
const typeDefs = `
  type Query {
    currentNumber: Int
  }

  type Subscription {
    numberIncremented: Test
  }

  type Test {
    currentNumber: Int
    timestamp: String
  }
`;

// Resolver map
const resolvers = {
  Query: {
    currentNumber() {
      return currentNumber;
    },
  },
  Subscription: {
    numberIncremented: {
      subscribe: () => pubsub.asyncIterator(['NUMBER_INCREMENTED']),
    },
  },
};

// Create schema, which will be used separately by ApolloServer and
// the WebSocket server.
const schema = makeExecutableSchema({ typeDefs, resolvers });

(async () => {
  await app.prepare()

  const expressServer = express();

  const httpServer = createServer(expressServer);
  
  // server.use("*", (req, res) => {
  //   console.log(req.protocol, req.url, req.baseUrl, req.originalUrl);
  //   handle(req, res, {pathname: req.baseUrl});
  // });

  // Set up WebSocket server.
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/api/graphql',
  });

  const serverCleanup = useServer({schema}, wsServer);

  const apolloServer = new ApolloServer({
    resolvers,
    typeDefs,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ]
  });

  await apolloServer.start();

  expressServer.use(
    '/api/graphql',
    express.json(),
    expressMiddleware(apolloServer)
  );

  expressServer.use("*", (req, res) => {
    console.log('proto', req.protocol, 'url', req.url, 'base', req.baseUrl, 'orig', req.originalUrl);
    handle(req, res, {pathname: req.baseUrl});
  });

  await new Promise(resolve => httpServer.listen(port, resolve));

  console.log('Server is set up');
})()

// In the background, increment a number every second and notify subscribers when it changes.
function incrementNumber() {
  currentNumber++;
  pubsub.publish('NUMBER_INCREMENTED', { numberIncremented: {
    currentNumber: currentNumber,
    timestamp: Date.now().toString()
  } });
  setTimeout(incrementNumber, 1000);
}

// Start incrementing
incrementNumber();