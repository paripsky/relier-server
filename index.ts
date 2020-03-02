import WebSocket, { Server as WebSocketServer } from 'ws';
import { generateId, hash } from './utils';
// jwt token instead of hash
const appSecret = hash('relier');

const port = 9000;

const wss = new WebSocketServer({ port });

const users = new Map<string, string>();
const rooms = new Map<string, WebSocket[]>();
/**
 * instead of rooms, leave just the users map
 * instead of secret, on connect the user will send the other users secret and pass of the one that is hosting
 * on connect, the username + pass will be checked and a token will be given?
 * no rooms, just user to user?
 * or maybe when the connection is made their both added to a room?
 * think of the best way to do this
 * electron should auto login and the host button should just host?
 * auto generate username & password or let the user pick a username?
 * how to implement tokens better? set a time limit for them? save some data on the token? json web token with a user field?
 */

const getOtherConnection = (
  rooms: Map<string, WebSocket[]>,
  connection: WebSocket,
  token: string
) => {
  const room = rooms.get(token) || [];
  const otherConnection = room.find(conn => conn !== connection);

  return otherConnection;
};

wss.on('listening', () => {
  console.info(`Listening on port ${port}`);
});

//when a user connects to our sever
wss.on('connection', function(connection) {
  console.log('User connected');

  //when server gets a message from a connected user
  connection.on('message', function(message: any) {
    let data;
    //accepting only JSON messages
    try {
      data = JSON.parse(message);
      console.log(`${data.type} request: data is `, data);
    } catch (e) {
      console.log('Invalid JSON');
      data = {};
    }

    //switching type of the user message
    switch (data.type) {
      //when a user tries to login

      case 'login':
        {
          const { secret, password } = data;
          const token = hash(`${secret}${password}${appSecret}`);

          if (users.has(secret)) {
            if (users.get(secret) === password) {
              const room = rooms.get(token) || [];
              rooms.set(token, [...room, connection]);
            } else {
              sendTo(connection, {
                type: 'login',
                error: 'wrong password',
                success: false
              });
              return;
            }
          } else {
            users.set(secret, password);
            rooms.set(token, [connection]);
          }

          sendTo(connection, {
            type: 'login',
            token
          });
        }
        break;

      case 'offer':
        {
          const { token } = data;

          const otherConnection = getOtherConnection(rooms, connection, token);
          console.log('Sending offer to: ', otherConnection);

          if (otherConnection != null) {
            sendTo(otherConnection, {
              type: 'offer',
              offer: data.offer
            });
          }
        }
        break;

      case 'answer':
        {
          const { token } = data;

          const otherConnection = getOtherConnection(rooms, connection, token);
          console.log('Sending answer to: ', otherConnection);

          if (otherConnection != null) {
            sendTo(otherConnection, {
              type: 'answer',
              answer: data.answer
            });
          }
        }
        break;

      case 'candidate':
        {
          const { token } = data;

          const otherConnection = getOtherConnection(rooms, connection, token);
          console.log('Sending candidate to:', otherConnection);

          if (otherConnection != null) {
            sendTo(otherConnection, {
              type: 'candidate',
              candidate: data.candidate
            });
          }
        }
        break;

      case 'leave':
        {
          const { token } = data;

          const otherConnection = getOtherConnection(rooms, connection, token);
          console.log('Disconnecting from', otherConnection);

          if (otherConnection != null) {
            sendTo(otherConnection, {
              type: 'leave'
            });
          }
        }
        break;

      default:
        sendTo(connection, {
          type: 'error',
          message: 'Command not found: ' + data.type
        });

        break;
    }
  });

  //when user exits, for example closes a browser window
  //this may help if we are still in "offer","answer" or "candidate" state
  connection.on('close', function() {
    console.log('connection closed', connection);
    // if (connection.name) {
    //   delete users[connection.name];

    //   if (connection.otherName) {
    //     console.log('Disconnecting from ', connection.otherName);
    //     let conn = users[connection.otherName];
    //     conn.otherName = null;

    //     if (conn != null) {
    //       sendTo(conn, {
    //         type: 'leave'
    //       });
    //     }
    //   }
    // }
  });
});

function sendTo(connection: WebSocket, message: any) {
  connection.send(JSON.stringify(message));
}
