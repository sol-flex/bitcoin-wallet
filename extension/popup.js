document.addEventListener('DOMContentLoaded', async () => {
    // Check if private keys are stored
    chrome.storage.local.get('walletKeys', (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error retrieving data:', chrome.runtime.lastError);
      } else {

        const keys = JSON.parse(result.walletKeys)
        if (keys && keys.privateKey) {
          // Private key exists: Show wallet info UI
          displayWalletInfo(keys);
        } else {
          // No private key: Show generate wallet UI
          displayGenerateWalletUI();
        }
      }
    });

    document.getElementById('generateWallet').addEventListener('click', async () => {

        if(window.myWalletUtils) {
            const keys = window.myWalletUtils.generateSegwitAddress()
            console.log(keys);
            chrome.storage.local.set({ walletKeys: JSON.stringify(keys) })
    
            chrome.storage.local.get('walletKeys', (result) => {

                const keys = JSON.parse(result.walletKeys)

                displayWalletInfo(keys);

                console.log('Wallet Keys:', JSON.parse(result.walletKeys));
            });
              
    
        } else {
            console.log("yeah, nah!")
        }
    });

    document.getElementById('createTransaction').addEventListener('click', async () => {

        const createSegwitTransaction = async (amount, destAddress) => {

            const fetchUtxos = async (address) => {
  
                const { bitcoin } = window.myWalletUtils.mempoolJS({
                  hostname: 'mempool.space'
                });
            
                const addressTxsUtxo = await bitcoin.addresses.getAddressTxsUtxo({ address });
                console.log(addressTxsUtxo);
                return addressTxsUtxo;
            
                        
            };

            const getFees = async () => {
                const {
                    bitcoin: { fees },
                  } = window.myWalletUtils.mempoolJS();
                  
                  const feesRecommended = await fees.getFeesRecommended();
                  console.log(feesRecommended);
                  return feesRecommended;
            }
            

            const getTx = async (txid) => {
                const {
                    bitcoin: { transactions },
                  } = window.myWalletUtils.mempoolJS();
                        
                  const tx = await transactions.getTx({ txid });
            
                  return tx;
            
            }

            const satoshis = Math.ceil(amount * 100000000)
        
        
            const ECPair = window.myWalletUtils.ECPairFactory(window.myWalletUtils.tinysecp);
            // Load keys from file
            const privateKeyBuffer = window.myWalletUtils.Buffer.from(keys.privateKey, 'hex');
            const keyPair = ECPair.fromPrivateKey(privateKeyBuffer);
        
            const { privateKey, publicKey } = keyPair;
            
            console.log("Private key: ", privateKey);
            console.log("Public key: ", publicKey);
        
            // Derive the SegWit address from the public key
            const { address } = window.myWalletUtils.bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey });
            console.log('Address:', address);
        
            const utxos = await fetchUtxos(address);
        
            console.log("hello")
        
            if (utxos.length === 0 || utxos.length === undefined) {
                throw new Error('No UTXOs found for address');
            }
        
            let sum = 0;
            let numUtxos = 0;
        
            const txb = new window.myWalletUtils.bitcoin.Psbt()
        
            let fee = 0;
        
            console.log(utxos.length)
        
            for (let i = 0; i < utxos.length; i++) {
        
                console.log(i)
        
                sum += utxos[i].value
                console.log(utxos[i].value)
                console.log(sum)
                numUtxos++;
        
                const tx = await getTx(utxos[i].txid)
        
                console.log("Transaction: ", tx);
        
                txb.addInput({
                    hash: utxos[i].txid,
                    index: utxos[i].vout,
                    sequence: 0xFFFFFFFE,
                    witnessUtxo: {
                        script: window.myWalletUtils.Buffer.from(`${tx.vout[utxos[i].vout].scriptpubkey}`, 'hex'),
                        value: utxos[i].value
                    }
                })
        
                const overhead = 10.5
                const input = 68
                const output = 31
                const txSizeInVbytes = overhead + (input * numUtxos) + (output * 2)
        
                console.log("Size in vBytes: ", txSizeInVbytes)
        
                const feesRecommended = await getFees();
                const rate = feesRecommended.hourFee
        
                fee = Math.ceil(txSizeInVbytes * rate)
        
        
                if(sum > satoshis + fee) {
                    break;
                }
        
                console.log("end of for loop")
        
            }
        
            console.log(sum, numUtxos, fee)
        
            txb.addOutput({
                address: destAddress,
                value: satoshis
            })
        
            txb.addOutput({
                address: address,
                value: sum - satoshis - fee
            })
        
            for (let i = 0; i < numUtxos; i++) {
                txb.signInput(i, keyPair);
            }
        
            txb.finalizeAllInputs();
        
            let tx = txb.extractTransaction();

            const txHex = tx.toHex()
        
            console.log(txHex);
            console.log(tx)

            const response = await fetch('http://localhost:3001/api/sendTransaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ txHex: txHex })
            });
    
            // Check if the response status is OK (status code 200-299)
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
    
            // Parse the JSON response
            const data = await response.json();
            console.log('Transaction response:', data);
    
            return tx.toHex();       
        }

        const amount = parseFloat(document.getElementById('amount').value);
        const destAddress = document.getElementById('destAddress').value;

        console.log(amount)
        console.log(destAddress);

        let keys = null;

        chrome.storage.local.get('walletKeys', (result) => {

            keys = JSON.parse(result.walletKeys)
            privateKey = keys.privateKey;

            console.log(keys)

            console.log(privateKey)
    
            createSegwitTransaction(amount, destAddress);

        });

    });


    const displayGenerateWalletUI = () => {

        let walletInfoDiv = document.getElementById('walletInfo')
        walletInfoDiv.style.display = 'none';
    };
      
    const displayWalletInfo = async (keys) => {

        let walletInfoDiv = document.getElementById('walletInfo');
        walletInfoDiv.style.display = 'block';

       let noWalletInfoDiv = document.getElementById('noWalletInfo')
       noWalletInfoDiv.style.display = 'none';
        
        const address = window.myWalletUtils.bitcoin.payments.p2wpkh({ pubkey: window.myWalletUtils.Buffer.from(keys.publicKey, 'hex') }).address;
        document.getElementById('bitcoinAddress').innerText = `Address: ${address}`;

        const utxos = await fetchWalletBalance(address)
        const satoshiBalance = sumUtxos(utxos)
        const btcBalance = satoshiBalance / 100_000_000


        document.getElementById('bitcoinBalance').innerText = `${btcBalance} BTC`;


        console.log(walletBalance);
    

        
    };

    const fetchWalletBalance = async (address) => {

            const { bitcoin: { addresses } } = window.myWalletUtils.mempoolJS({
                hostname: 'mempool.space'
              });
            
              const utxos = await addresses.getAddressTxsUtxo({ address });
              console.log(utxos);
                        
    
            return utxos;
    
    };

    const sumUtxos = (utxos) => {
        return utxos.reduce((total, tx) => {
            if (tx.status.confirmed) {
                return total + tx.value;
            }
            return total;
        }, 0);
    };
    
        
});
  
