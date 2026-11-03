import { TonClient, WalletContractV4, internal } from '@ton/ton'; 
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { ethers } from 'ethers';

export const FALLBACK_MASTER_WALLET_GRAM = "UQBW9toUVg75NhhayTPW2RzMhHJxF1_BOKULqSYDZIvZBoIk";
export const FALLBACK_MASTER_WALLET_USDT = "0x3062f1AbE78Cef11190c8A654Ef7F9e101E4eAce";

export const tonClient = new TonClient({ 
  endpoint: 'https://toncenter.com/api/v2/jsonRPC',
  apiKey: process.env.TONCENTER_API_KEY || ''
});

export const BSC_RPC = "https://bsc-dataseed.binance.org/";
export const USDT_BEP20_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

// Exportamos las utilidades criptográficas para poder usarlas en el enrutador
export { WalletContractV4, internal, mnemonicNew, mnemonicToPrivateKey, ethers };

export async function getTonPrice() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
    const data = await res.json();
    return data['the-open-network'].usd || 5.0;
  } catch (e) { return 5.0; }
}

export function getDerivedUsdtWallet(userId) {
  const masterKey = process.env.BSC_PRIVATE_KEY; 
  if (!masterKey) throw new Error("Falta la variable BSC_PRIVATE_KEY en Vercel.");
  const userPrivKey = ethers.keccak256(ethers.toUtf8Bytes(masterKey + "_clicknetwork_" + userId));
  return new ethers.Wallet(userPrivKey);
}

export async function sweepUsdtAutomated(derivedWallet, usdtAmountWei, destinationWallet = FALLBACK_MASTER_WALLET_USDT) {
  try {
    const provider = new ethers.JsonRpcProvider(BSC_RPC);
    const connectedDerived = derivedWallet.connect(provider);
    const masterWallet = new ethers.Wallet(process.env.BSC_PRIVATE_KEY, provider);

    const usdtAbi = ["function transfer(address to, uint256 amount) returns (bool)"];
    const usdtContract = new ethers.Contract(USDT_BEP20_ADDRESS, usdtAbi, connectedDerived);

    const bnbBalance = await provider.getBalance(derivedWallet.address);
    const minBnbGas = ethers.parseEther("0.0004");

    // Si la billetera derivada no tiene gas para enviar los USDT, le transferimos BNB
    if (bnbBalance < minBnbGas) {
      const fundTx = await masterWallet.sendTransaction({
        to: derivedWallet.address,
        value: minBnbGas - bnbBalance
      });
      await fundTx.wait(); 
    }

    const tx = await usdtContract.transfer(destinationWallet, usdtAmountWei);
    await tx.wait();
  } catch (error) {
    console.error("Error en barrido automático USDT:", error);
  }
}

// Función auxiliar de espera para sincronización de bloques
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function sendTonAutomated(destinationAddress, usdtAmount) {
  const mnemonic = process.env.MASTER_WALLET_MNEMONIC; 
  if (!mnemonic) throw new Error("Falta la variable MASTER_WALLET_MNEMONIC en Vercel.");

  const tonPrice = await getTonPrice();
  const tonAmount = Number(usdtAmount) / Number(tonPrice); 

  const amountInNano = BigInt(Math.floor(tonAmount * 1000000000));

  const mnemonics = mnemonic.split(" ");
  const keyPair = await mnemonicToPrivateKey(mnemonics);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const contract = tonClient.open(wallet);
  const seqno = await contract.getSeqno();

  await contract.sendTransfer({
      seqno: seqno || 0,
      secretKey: keyPair.secretKey,
      messages: [internal({ to: destinationAddress, value: amountInNano, bounce: false, body: "Retiro TeleGem" })],
      sendMode: 3 
  });

  // Esperamos 8 segundos a que la blockchain TON confirme el bloque
  console.log("Pago enviado. Esperando 8 segundos a la blockchain...");
  await sleep(8000); 

  try {
    const res = await fetch(`https://toncenter.com/api/v2/getTransactions?address=${destinationAddress}&limit=1`);
    const data = await res.json();
    
    if (data.ok && data.result.length > 0) {
      const base64Hash = data.result[0].transaction_id.hash;
      return Buffer.from(base64Hash, 'base64').toString('hex'); 
    }
  } catch (error) {
    console.error("Fallo al buscar el TXID:", error);
  }
  
  return "Transaccion_En_Proceso"; 
}
