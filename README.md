# bitcoin-wallet 

(beta) - Please note, although this is a fully functioning wallet which is safe to use, 
it is advised to limit the amount of funds. It stores the private key unencrypted in chrome
extension local storage currently.

A simple Bitcoin wallet application for managing Bitcoin transactions. It creates a Segwit
p2wpkh wallet and allows for receiving and broadcasting transactions.

/extension

You can use this wallet by loading (load unpacked) the extension directory in chrome. Most of the logic
takes place in the popup.js file.

/server

The server is used to send the transaction but currently there is a bug in the public 
mempool.space API. Instead you can send the transaction and inspect to get the transaction hash
and broadcast the transaction:

https://www.blockchain.com/explorer/assets/btc/broadcast-transaction
