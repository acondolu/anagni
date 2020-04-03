# anagni [![Build Status](https://travis-ci.com/acondolu/anagni.svg?token=KEjzsAkTQF4oSVN4fngW&branch=master)](https://travis-ci.com/acondolu/anagni)

A TypeScript library for a simple [log-based replication](https://en.wikipedia.org/wiki/State_machine_replication#Input_Log) architecture.

This library takes an approach to replication logs called _statement-based replication_. Clients (followers) send statements to the server (leader), which logs them in order and then broadcasts them back to all clients.

Anagni is completely agnostic on the semantics of the log: the statements that are exchanged are considered by the leader completely opaque. This means that the only role of the leader is to enforce a sequential order to the statements it receives, and then relay them, without any parsing, check, or execution of the statements. If the clients (wisely!) do not trust the server, they can implement a layer of encryption/authentication over the channel of statements, for instance by using a previously shared secret, a [Diffie–Hellman key exchange](https://en.wikipedia.org/wiki/Diffie–Hellman_key_exchange#Operation_with_more_than_two_parties), and/or asymmetric cryptography.

This architecture is very flexible and can be adapted to various scenarios. This repo also contains an example implementation of [tic-tac-toe](https://en.wikipedia.org/wiki/Tic-tac-toe), the famous paper-and-pencil game. Game events and actions are implemented as statements in the replicated log. As a consequence of the persistence of the log, the state of the game can be resumed at any time in spite of players crashing, by simply replaying the log from the server.

## ⚠️ Work-in-progress
Unfortunately this project is in early alpha stage, and it lacks many of the features that make it usable by the public. Any help and collaboration are welcome!

## Usage

- To install npm dependencies: `npm install`
- To build: `npm run build`
- To start the server: `npm run server:start`

### Running example
Run the commands above, and also the following:
```
npm run dist
npm run serve
```
(The second command serves the contents of the project root directory on port 5000.)
Lastly, simply point your browser to 
http://localhost:5000/dist/tic-tac-toe/app.html.