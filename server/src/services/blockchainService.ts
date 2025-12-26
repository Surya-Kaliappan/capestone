import { Gateway, Wallets, Contract, GatewayOptions } from "fabric-network";
import path from 'path';
import fs from 'fs';

const CHANNEL_NAME = 'mychannel';
const CHAINCODE_NAME = 'agreement';
const MSP_ID = 'Org1MSP';

const walletPath = path.join(process.cwd(), 'wallet');

const ccpPath = path.resolve(
  process.env.FABRIC_CCP_PATH ||
  path.join(__dirname, '..', '..', 'connection-org1.json')
);

export const blockchainService = {
  getContract: async (userId: string): Promise<{ contract: Contract; gateway: Gateway }> => {
    try {
      const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
      const wallet = await Wallets.newFileSystemWallet(walletPath);

      // Check if user identity exists in the wallet
      const identity = await wallet.get(userId);
      if (!identity) {
        throw new Error(`Identity for user ${userId} does not exist in the wallet`);
      }

      const gateway = new Gateway();
      // Match the discovery settings from your old project
      const gatewayOpts: GatewayOptions = {
        wallet,
        identity: userId,
        discovery: { enabled: true, asLocalhost: true }
      };

      await gateway.connect(ccp, gatewayOpts);
      const network = await gateway.getNetwork(CHANNEL_NAME);
      const contract = network.getContract(CHAINCODE_NAME);

      return { contract, gateway };
    } catch (error) {
      console.error("Fabric connection error: ", error);
      throw error;
    }
  },

  recordAgreement: async (
    userId: string,
    agreementId: string,
    ipfsCid: string,
    contentHash: string,
    signatures: any[],
    version: string,
    parentId: string,
  ) => {
    let gateway;
    try {
      const connection = await blockchainService.getContract(userId);
      const contract = connection.contract;
      gateway = connection.gateway;

      await contract.submitTransaction(
        'CreateAsset',
        agreementId,
        ipfsCid,
        contentHash,
        JSON.stringify(signatures),
        version,
        parentId,
      );

      console.log('[Fabric] Transaction committed successfully');
      return true;
    } catch (error) {
      console.error(`[Fabric] Submit Failed: ${error}`);
      throw error;
    } finally {
      if(gateway) gateway.disconnect();
    }
  },

  queryAgreement: async (userId: string, agreementId: string) => {
    let gateway;
    try {
      const connection = await blockchainService.getContract(userId);
      const contract = connection.contract;
      gateway = connection.gateway;

      const result = await contract.evaluateTransaction('ReadAsset', agreementId);
      return JSON.parse(result.toString());
    } catch (error) {
      console.error(`[Fabric] Query Failed: ${error}`);
      throw error;
    } finally {
      if(gateway) gateway.disconnect();
    }
  }
};