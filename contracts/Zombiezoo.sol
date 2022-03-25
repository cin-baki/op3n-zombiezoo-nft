//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.12;

/// @creator: Dumbfoundead
/// @author: op3n.world

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract ZombiezooNFT is AccessControl, ReentrancyGuard, ERC721, ERC721Royalty {
    using ECDSA for bytes32;
    using Address for address;

    address private _owner;
    uint256 private _totalSupply;
    address payable private _fundRecipient;
    uint256 private _startIndex;
    bytes32 private _preSaleRoot;
    uint256 public constant UNIT_PRICE = 800000000000000000; // 0.8 ETH
    uint8 public constant MAX_PRESALE_PER_MINTER = 2;
    string private _tokenURI;
    mapping(address => uint8) private _preSaleMinted;
    mapping(address => bool) private _verifiers;
    mapping(bytes32 => bool) public finalized;

    constructor() ERC721("Zombiezoo", "ZBZ") {
        _owner = _msgSender();
        _verifiers[_owner] = true;
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
    }

    /**
     * @dev See {IERC165-supportsInterface}, {IERC2981-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, ERC721, ERC721Royalty) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Modifier that checks that an account has an admin role.
    */
    modifier onlyAdmin() {
        _checkRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner() == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        _owner = newOwner;
    }

    /**
     * @dev Set preSaleRoot of this contract
     * Can only be called by the admin.
     */
    function setPreSaleRoot(bytes32 root_) external onlyAdmin {
        _preSaleRoot = root_;
    }

    /**
     * @dev Get preSaleRoot
     */
    function preSaleRoot() external view returns(bytes32) {
        return _preSaleRoot;
    }

    /**
     * @dev Check address is verifier
     */
    function isVerifier(address verifier_) public view returns (bool) {
        return _verifiers[verifier_];
    }

    /**
     * @dev Set mint verifier of this contract
     * Can only be called by the admin.
     */
    function setVerifier(address verifier_) external onlyAdmin {
        _verifiers[verifier_] = true;
    }

    /**
     * @dev Revoke mint verifier of this contract
     * Can only be called by the admin.
     */
    function revokeVerifier(address verifier_) external onlyAdmin {
        _verifiers[verifier_] = false;
    }

    /**
     * @dev Activate this contract
     * Can only be called by the admin.
     */
    function activate(uint256 startIndex_, uint256 totalSupply_, string memory tokenURI_, address fundRecipient_) external onlyAdmin {
         require(_startIndex == 0, "ZBZ: Already activated");
        _startIndex = startIndex_;
        _totalSupply = totalSupply_;
        _tokenURI = tokenURI_;
        _fundRecipient = payable(fundRecipient_);
        _setDefaultRoyalty(_fundRecipient, 1000);
    }

    /**
     * @dev set tokenURI.
     */
    function setTokenURI(string memory tokenURI_) external onlyAdmin{
        _tokenURI = tokenURI_;
    }

    /**
     * @dev Returns the total amount of tokens stored by the contract.
     */
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev Returns fundRecipient address.
     */
    function fundRecipient() external view returns (address) {
        return _fundRecipient;
    }

    /**
     * @dev See {ERC721-_burn}, {ERC721Royalty-_burn}
     */
    function _burn(uint256 tokenId) internal virtual override(ERC721, ERC721Royalty) {
        super._burn(tokenId);
    }

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * by default, can be overriden in child contracts.
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _tokenURI;
    }

    /**
     * @dev mintTo tokenID to receiver.
     * Can only be called by the admin.
     */
    function mintTo(address toAddress, uint256 tokenId) external onlyAdmin {
        require(0 < tokenId && tokenId <= _startIndex, "ZBZ: Invalid tokenId, must be index for reserving");

        _mint(toAddress, tokenId);
    }

    /**
     * @dev mint a NFT.
     */
    function _mintNFT(uint256 tokenID, uint256 salt, bytes memory sig) internal {
        require(UNIT_PRICE <= msg.value, "ZBZ: Invalid amount");
        require(tokenID <= _totalSupply, "ZBZ: This tokenID does not exits");
        require(tokenID > _startIndex, "ZBZ: Invalid tokenID, this tokenID is reserved");

        bytes32 _verifiedHash = keccak256(abi.encodePacked(msg.sender, salt));
        require(!finalized[_verifiedHash], "ZBZ: Salt used");
        require(_verifiers[_verifiedHash.toEthSignedMessageHash().recover(sig)], "ZBZ: Unauthorized");
        
        finalized[_verifiedHash] = true;
        Address.sendValue(_fundRecipient, msg.value);
        _mint(msg.sender, tokenID);
    }

    /**
     * @dev mint a NFT without salt and sig.
     */
    function _mintNFTnoSig(uint256 tokenID) internal {
        require(UNIT_PRICE <= msg.value, "ZBZ: Invalid amount");
        require(tokenID <= _totalSupply, "ZBZ: This tokenID does not exits");
        require(tokenID > _startIndex, "ZBZ: Invalid tokenID, this tokenID is reserved");
        Address.sendValue(_fundRecipient, msg.value);
        _mint(msg.sender, tokenID);
    }

    /**
     * @dev validate a mint.
     */
    function _validateMint(bytes32[] memory proof) internal returns (bool) {
        if (_preSaleRoot == 0x00) {
            return true;
        }

        if (MerkleProof.verify(proof, _preSaleRoot, keccak256(abi.encodePacked(_msgSender())))) {
            if (MAX_PRESALE_PER_MINTER <= _preSaleMinted[_msgSender()]) {
                return false;
            }

            _preSaleMinted[_msgSender()]++;
            return true;
        }

        return false;
    }

    /**
     * @dev mint a NFT.
     */
    function mint(uint256 tokenID, uint256 salt, bytes memory sig, bytes32[] memory proof) external nonReentrant payable {
        require(_validateMint(proof), "ZBZ: Can not mint");
        _mintNFT(tokenID, salt, sig);
    }

    /**
     * @dev mint a NFT without salt and sig.
     */
    function mintTokenID(uint256 tokenID, bytes32[] memory proof) external nonReentrant payable {
        require(_validateMint(proof), "ZBZ: Can not mint");
        _mintNFTnoSig(tokenID);
    }

    /**
     * @dev preMint a NFT.
     */
    function preMint(uint256 tokenID, uint256 salt, bytes memory sig, bytes32[] memory proof) external nonReentrant payable {
        require(MerkleProof.verify(proof, _preSaleRoot, keccak256(abi.encodePacked(_msgSender()))), "ZBZ: Can not mint");
        _mintNFT(tokenID, salt, sig);
    }
}