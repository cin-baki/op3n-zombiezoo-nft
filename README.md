# NeighborheadzNFT smart contract

Website: https://neighborheadz.op3n.world/

Mint site: T.B.D

# Setup project with hardhat

1. Install hardhat `npm install --save-dev hardhat`
2. Install packages: `npm install`
3. Install shorthand: `npm i -g hardhat-shorthand` after install can run hardhat command by `hh` instead of `npx hardhat`

# Compile, deploy and verify smart contract

Script env vars:
  | key                                      | description                                                                                                                                                        |
|------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `PRIVATE_KEY`                            | a mnemonic or private key of deployer's account, ignore if when deploy on hardhat local. The account should have native coin to run deploy contract scripts                     |
| `ROPSTEN_URL`, `RINKEBY_URL`, `GOERLI_URL` | network gateway, get at: [infura](https://infura.io/) [moralis](https://moralis.io/)                                                                               |
| `ETHERSCAN_API_KEY`                      | explorer api key, get at:  [etherscan](https://etherscan.io/myapikey) [bscscan](https://bscscan.com/myapikey) [polygonscan](https://polygonscan.com/myapikey)... |

## Deploy and Verify:

**Command**
1. Set env vars
2. Deploy contract: `hh run scripts/deploy.ts --network <network>`
3. Verify contract: `hh verify <contract_address> --contract contracts/NeighborheadzNFT.sol:NeighborheadzNFT --network <network>`

# Testing

**Command**
  `hh test`

## Test cases
  ```
    NeighborheadzNFT contract
      #initialize
        ✔ sets name is Neighborheadz
        ✔ sets symbol is NBHZ
        ✔ sets UNIT_PRICE is 0.1 eth
        ✔ sets MAX_PRESALE_PER_MINTER is 2
        ✔ sets owner is deployer
        ✔ sets owner is verifier
        ✔ grants owner is Admin
      #supportsInterface(bytes4 interfaceId) external view returns (bool)
        when supports ERC721 - Non-Fungible Token Standard
          ✔ returns true
        when supports ERC721Metadata - Non-Fungible Token Standard metadata extension
          ✔ returns true
        when supports EIP2981 - NFT Royalty Standard
          ✔ returns true
      #transferOwnership(address newOwner) external onlyOwner
        ✔ sets new owner for contract
        when caller is not owner
          ✔ reverts with Ownable:
      #setVerifier(address verifier_) external onlyAdmin
        ✔ sets verifier
        when caller is not admin
          ✔ reverts with AccessControl:
      #revokeVerifier(address verifier_) external onlyAdmin
        ✔ revokes verifier
        when caller is not admin
          ✔ reverts with AccessControl:
      #activate(uint256 startIndex_, uint256 totalSupply_, string memory tokenURI_, address fundRecipient_) external onlyAdmin
        when caller is admin
          ✔ sets startIndex is 80
          ✔ sets totalSupply is 5555
          ✔ sets baseURI is https://nft.uri
          ✔ sets fundRecipient
          ✔ sets tokenIndex is 80
          ✔ sets royaltyInfo is fundRecipient and 10%
          when already activated
            ✔ reverts with NBHZ: Already activated
        when caller is not admin
          ✔ reverts with AccessControl:
      #mintTo(address toAddress, uint256 tokenId) external onlyAdmin
        ✔ mints tokenID to toAddress
        ✔ increases toAddress balance by 1
        when tokenId already minted
          ✔ reverts with ERC721: token already minted
        when tokenId is 0
          ✔ reverts with NBHZ: Invalid tokenId
        when tokenId is greater than startIndex
          ✔ reverts with NBHZ: Invalid tokenId
        when caller is not admin
          ✔ reverts with AccessControl:
      #mint(uint256 salt, bytes memory sig) external nonReentrant payable
        ✔ marks sig is finalized
        ✔ increases tokenIndex by 1
        ✔ sets right tokenURI minter balance
        ✔ increases minter balance by 1
        ✔ sends funds to fundRecipient
        ✔ mints tokenID to minter
        when preSaleRoot exists
          when valid proof
            ✔ mints tokenID to minter
            when minted is greater than MAX_PRESALE_PER_MINTER(is 2)
              ✔ reverts NBHZ: Can not mint
          when proof is empty
            ✔ reverts NBHZ: Can not mint
          when invalid proof
            ✔ reverts NBHZ: Can not mint
          when set preSaleRoot is empty
            ✔ when call mint with empty proof, mints tokenID to minter
        when value is less than UNIT_PRICE
          ✔ reverts NBHZ: Invalid amount
        when tokens reach limit total supply
          ✔ reverts NBHZ: Reach total supply (115ms)
        when sig used
          ✔ reverts NBHZ: Salt Used
        when sig recover is not a verifier
          ✔ reverts NBHZ: Unauthorized
  ```
