import FabricCAServices from 'fabric-ca-client';
import { Wallets } from 'fabric-network';
import fs from 'fs';
import path from 'path';

async function main() {
    try {
        // 1. Load the Network Configuration (Connection Profile)
        // Adjust this path to point to your real 'connection-org1.json'
        const ccpPath = path.resolve(__dirname, '..', '..', 'connection-org1.json');
        
        if (!fs.existsSync(ccpPath)) {
            console.error(`❌ Cannot find connection profile at: ${ccpPath}`);
            console.error("Please copy 'connection-org1.json' from your Fabric network folder to the root of this server.");
            return;
        }

        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // 2. Create the CA Client
        // Assumes your CA name is 'ca.org1.example.com' (Standard in test-network)
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // 3. Create/Open the Wallet
        // This is where credentials will be stored securely
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Using wallet path: ${walletPath}`);

        // 4. Check if Admin already exists
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('⚠️  An identity for the admin user "admin" already exists in the wallet');
            return;
        }

        // 5. Enroll the Admin User
        // Default Fabric credentials are often ID: 'admin', Secret: 'adminpw'
        console.log("Enrolling admin...");
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        
        // 6. Import Identity into Wallet
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        await wallet.put('admin', x509Identity);
        console.log('✅ Successfully enrolled admin user "admin" and imported it into the wallet');

    } catch (error) {
        console.error(`❌ Failed to enroll admin user "admin": ${error}`);
        process.exit(1);
    }
}

main();