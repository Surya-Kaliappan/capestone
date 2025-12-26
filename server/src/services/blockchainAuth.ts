import { Wallets, X509Identity } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import path from 'path';
import fs from 'fs';

// CONFIGURATION (Adjust paths to match your folder structure)
const ccpPath = path.resolve(__dirname, '..', '..', 'connection-org1.json');
const walletPath = path.join(process.cwd(), 'wallet');
const mspId = 'Org1MSP';

export const registerBlockchainUser = async (userId: string): Promise<void> => {
    try {
        // 1. Load Connection Profile
        if (!fs.existsSync(ccpPath)) {
            throw new Error(`Connection profile not found at: ${ccpPath}`);
        }
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // 2. Setup CA Client
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // 3. Setup Wallet
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // 4. Check if user already exists
        const userIdentity = await wallet.get(userId);
        if (userIdentity) {
            console.log(`⚠️ Identity for ${userId} already exists in the wallet`);
            return;
        }

        // 5. Must use Admin to register new users
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            throw new Error('Admin identity not found in wallet. Run enrollAdmin.ts first!');
        }

        // Build a User Object for the Admin to sign with
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // 6. Register the User (Get the Enrollment Secret)
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: userId,
            role: 'client'
        }, adminUser);

        console.log(`✅ Successfully registered user "${userId}" - Secret: ${secret}`);

        // 7. Enroll the User (Get the Keys/Certificate)
        const enrollment = await ca.enroll({
            enrollmentID: userId,
            enrollmentSecret: secret
        });

        // 8. Import into Wallet
        const x509Identity: X509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: mspId,
            type: 'X.509',
        };

        await wallet.put(userId, x509Identity);
        console.log(`✅ Successfully enrolled user "${userId}" and imported to wallet`);

    } catch (error) {
        console.error(`❌ Failed to register blockchain user: ${error}`);
        throw new Error(`Blockchain registration failed: ${error}`);
    }
};