'use strict';

const { Contract } = require('fabric-contract-api');

class AgreementContract extends Contract {
    async CreateAsset(ctx, agreementId, ipfsCid, contentHash, signaturesJson, version, parentId) {
        const exists = await this.AssetExists(ctx, agreementId);
        if (exists) {
            throw new Error(`The agreement ${agreementId} already exists`);
        }

        const agreement = {
            docType: 'agreement',
            agreementId,
            version: parseInt(version),
            parentId: parentId || "ORIGINAL",
            ipfsCid,
            contentHash,
            signatures: JSON.parse(signaturesJson),
            createdAt: ctx.stub.getTxTimestamp(),
        };

        await ctx.stub.putState(agreementId, Buffer.from(JSON.stringify(agreement)));
    }

    async ReadAsset(ctx, agreementId) {
        const assetJSON = await ctx.stub.getState(agreementId);
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The agreement ${agreementId} does not exist`);
        }
        return assetJSON.toString();
    }

    async AssetExists(ctx, agreementId) {
        const assetJSON = await ctx.stub.getState(agreementId);
        return assetJSON && assetJSON.length > 0;
    }
}

module.exports = AgreementContract;