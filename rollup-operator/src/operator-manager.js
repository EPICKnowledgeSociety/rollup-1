/*global BigInt*/
const Web3 = require("web3");

/**
 * Interface to interact with rollup PoS contract
 */
class OperatorManager {
    /**
     * Initilize operator manager
     * @param {String} nodeUrl - ethereum node url 
     * @param {String} contractAddress - Rollup PoS address
     * @param {Object} abi - Rollup PoS interface
     * @param {Object} wallet - wallet to sign transactions
     * @param {Number} gasMul - gas multiplier
     * @param {Number} gasLimit - gas limit
     */
    constructor(nodeUrl, contractAddress, abi, wallet, gasMul, gasLimit){
        this.wallet = wallet;
        this.nodeUrl = nodeUrl;
        this.posAddress = contractAddress;
        this.web3 = new Web3(new Web3.providers.HttpProvider(this.nodeUrl));
        this.rollupPoS = new this.web3.eth.Contract(abi, this.posAddress);
        this.gasMul = BigInt(gasMul);
        // Default is described in:
        // https://iden3.io/post/istanbul-zkrollup-ethereum-throughput-limits-analysis
        this.gasLimit = (gasLimit === "default") ? (2 * 616240): gasLimit;
    }

    /**
     * Get gas price to use when sending a transaction
     * @returns {String} - BigInt encoded as string
     */
    async _getGasPrice(){
        const strAvgGas = await this.web3.eth.getGasPrice();
        const avgGas = BigInt(strAvgGas);
        return (avgGas * this.gasMul).toString();
    }

    /**
     * Add operator to Rollup PoS
     * @param {String} rndHash - chainhash 
     * @param {Number} stakeValue - value to stake measured in ether
     * @param {String} url - operator url to be publish on Rollup PoS contract
     * @returns {Object} - transaction signed
     */
    async getTxRegister(rndHash, stakeValue, url) {
        const tx = {
            from:  this.wallet.address,
            to: this.posAddress,
            gasLimit: this.gasLimit,
            gasPrice: await this._getGasPrice(),
            value: this.web3.utils.toHex(this.web3.utils.toWei(stakeValue.toString(), "ether")),
            data: this.rollupPoS.methods.addOperator(rndHash, url).encodeABI()
        };
        return await this.signTransaction(tx);
    }

    /**
     * Remove operator from Rollup PoS
     * @param {Number} opId - operator identifier
     * @returns {Object} - transaction signed 
     */
    async getTxUnregister(opId) {
        const tx = {
            from:  this.wallet.address,
            to: this.posAddress,
            gasLimit: this.gasLimit,
            gasPrice: await this._getGasPrice(),
            data: this.rollupPoS.methods.removeOperator(opId.toString()).encodeABI()
        };
        return await this.signTransaction(tx);
    }

    /**
     * Withdraw amount staked from Rollup PoS 
     * @param {Number} opId - operator identifier
     * @returns {Object} - signed transaction 
     */
    async getTxWithdraw(opId) {
        const tx = {
            from:  this.wallet.address,
            to: this.posAddress,
            gasLimit: this.gasLimit,
            gasPrice: await this._getGasPrice(),
            data: this.rollupPoS.methods.withdraw(opId.toString()).encodeABI()
        };
        return await this.signTransaction(tx);
    }

    /**
     * Commit batch data
     * @param {String} prevHash - hash to reveal
     * @param {String} compressedTx - off-chain data transactions
     * @returns {Object} - signed transaction 
     */
    async getTxCommit(prevHash, compressedTx) {
        const tx = {
            from:  this.wallet.address,
            to: this.posAddress,
            gasLimit: this.gasLimit,
            gasPrice: await this._getGasPrice(),
            data: this.rollupPoS.methods.commitBatch(prevHash, compressedTx).encodeABI()
        };
        return await this.signTransaction(tx);
    }

    /**
     * Forge data commited
     * @param {Array} proofA - zkSnark proof 
     * @param {Array} proofB - zkSnark proof
     * @param {Array} proofC - zkSnark proof
     * @param {Array} input - zkSnark public inputs
     * @returns {Object} - signed transaction
     */
    async getTxForge(proofA, proofB, proofC, input) {
        const tx = {
            from:  this.wallet.address,
            to: this.posAddress,
            gasLimit: this.gasLimit,
            gasPrice: await this._getGasPrice(),
            data: this.rollupPoS.methods.forgeCommittedBatch(proofA, proofB, proofC, input).encodeABI()
        };
        return await this.signTransaction(tx);
    }

    /**
     * Commit and forge data
     * @param {String} prevHash - hash to reveal
     * @param {String} compressedTx - off-chain data transactions
     * @param {Array} proofA - zkSnark proof 
     * @param {Array} proofB - zkSnark proof
     * @param {Array} proofC - zkSnark proof
     * @param {Array} input - zkSnark public inputs
     * @returns {Object} - signed transaction
     */
    async getTxCommitAndForge(prevHash, compressedTx, proofA, proofB, proofC, input) {
        const tx = {
            from:  this.wallet.address,
            to: this.posAddress,
            gasLimit: this.gasLimit,
            gasPrice: await this._getGasPrice(),
            data: this.rollupPoS.methods.commitAndForge(prevHash, compressedTx, 
                proofA, proofB, proofC, input).encodeABI()
        };
        const txSign = await this.signTransaction(tx);
        return [txSign, tx];
    }
    
    /**
     * Sign ethereum transaction
     * @param {Object} tx - Raw ethreum transaction
     * @returns {Objject} - signed transaction 
     */
    async signTransaction(tx) {
        return await this.web3.eth.accounts.signTransaction(tx, this.wallet.privateKey);
    }
}

module.exports = OperatorManager;