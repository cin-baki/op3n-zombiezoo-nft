import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 = require("keccak256");

describe("ZombiezooNFT contract", function () {
  let contract: any;
  let owner: any;
  let addrs: any;
  const sigTypes = ["address", "uint256"];

  beforeEach(async function () {
    [owner, ...addrs] = await ethers.getSigners();

    const contractFactory = await ethers.getContractFactory("ZombiezooNFT");
    contract = await contractFactory.deploy();
  });

  describe("#initialize", function () {
    it("sets name is Zombiezoo", async function () {
      expect(await contract.name()).to.equal("Zombiezoo");
    });

    it("sets symbol is ZBZ", async function () {
      expect(await contract.symbol()).to.equal("ZBZ");
    });

    it("sets UNIT_PRICE is 0.8 eth", async function () {
      expect(await contract.UNIT_PRICE()).to.equal(
        ethers.utils.parseUnits("0.8", "ether")
      );
    });

    it("sets MAX_PRESALE_PER_MINTER is 2", async function () {
      expect(await contract.MAX_PRESALE_PER_MINTER()).to.equal(2);
    });

    it("sets owner is deployer", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("sets owner is verifier", async function () {
      expect(await contract.isVerifier(owner.address)).to.equal(true);
    });

    it("grants owner is Admin", async function () {
      const adminRole = await contract.DEFAULT_ADMIN_ROLE();
      expect(await contract.hasRole(adminRole, owner.address)).to.equal(true);
    });
  });

  describe("#supportsInterface(bytes4 interfaceId) external view returns (bool)", function () {
    describe("when supports ERC721 - Non-Fungible Token Standard", function () {
      it("returns true", async function () {
        expect(await contract.supportsInterface(0x80ac58cd)).to.equal(true);
      });
    });

    describe("when supports ERC721Metadata - Non-Fungible Token Standard metadata extension", function () {
      it("returns true", async function () {
        expect(await contract.supportsInterface(0x5b5e139f)).to.equal(true);
      });
    });

    describe("when supports EIP2981 - NFT Royalty Standard", function () {
      it("returns true", async function () {
        expect(await contract.supportsInterface(0x2a55205a)).to.equal(true);
      });
    });
  });

  describe("#transferOwnership(address newOwner) external onlyOwner", function () {
    it("sets new owner for contract", async function () {
      const newOwner = addrs[2];

      expect(await contract.owner()).to.equal(owner.address);
      await contract.transferOwnership(newOwner.address);
      expect(await contract.owner()).to.equal(newOwner.address);
    });

    describe("when caller is not owner", function () {
      it("reverts with Ownable:", async function () {
        const caller = addrs[1];
        const newOwner = addrs[2];

        expect(await contract.owner()).to.equal(owner.address);
        await expect(
          contract.connect(caller).transferOwnership(newOwner.address)
        ).to.be.revertedWith("Ownable:");
        expect(await contract.owner()).to.equal(owner.address);
      });
    });
  });

  describe("#setVerifier(address verifier_) external onlyAdmin", function () {
    it("sets verifier", async function () {
      const verifier = addrs[2];

      expect(await contract.isVerifier(verifier.address)).to.equal(false);
      await contract.setVerifier(verifier.address);
      expect(await contract.isVerifier(verifier.address)).to.equal(true);
    });

    describe("when caller is not admin", function () {
      it("reverts with AccessControl:", async function () {
        await expect(
          contract.connect(addrs[0]).setVerifier(addrs[1].address)
        ).to.be.revertedWith("AccessControl:");
      });
    });
  });

  describe("#revokeVerifier(address verifier_) external onlyAdmin", function () {
    let verifier: any;
    beforeEach(async function () {
      verifier = addrs[2];
      await contract.setVerifier(verifier.address);
    });

    it("revokes verifier", async function () {
      expect(await contract.isVerifier(verifier.address)).to.equal(true);
      await contract.revokeVerifier(verifier.address);
      expect(await contract.isVerifier(verifier.address)).to.equal(false);
    });

    describe("when caller is not admin", function () {
      it("reverts with AccessControl:", async function () {
        await expect(
          contract.connect(addrs[0]).revokeVerifier(addrs[1].address)
        ).to.be.revertedWith("AccessControl:");
      });
    });
  });

  describe("#activate(uint256 startIndex_, uint256 totalSupply_, string memory tokenURI_, address fundRecipient_) external onlyAdmin", function () {
    describe("when caller is admin", function () {
      let fundRecipient: any;

      beforeEach(async function () {
        fundRecipient = addrs[2];
        await contract.activate(
          50,
          1000,
          "https://nft.uri/",
          fundRecipient.address
        );

        const salt = new Date().getTime();
        const orderHash = ethers.utils.solidityKeccak256(sigTypes, [
          owner.address,
          salt,
        ]);
        const sig = await owner.signMessage(ethers.utils.arrayify(orderHash));
        await contract.mint(51, salt, sig, [], {
          value: ethers.utils.parseUnits("0.8", "ether"),
        });
      });

      it("sets startIndex for token ID is 50, and can mint from token ID 51", async function () {
        expect(await contract.tokenURI(51)).to.equal("https://nft.uri/51");
      });

      it("sets totalSupply is 1000", async function () {
        expect(await contract.totalSupply()).to.equal(1000);
      });

      it("sets baseURI is https://nft.uri", async function () {
        expect(await contract.tokenURI(51)).to.equal("https://nft.uri/51");
      });

      it("sets fundRecipient", async function () {
        expect(await contract.fundRecipient()).to.equal(fundRecipient.address);
      });

      it("sets tokenIndex is 50", async function () {
        expect(await contract.tokenURI(51)).to.equal("https://nft.uri/51");
      });

      it("sets royaltyInfo is fundRecipient and 10%", async function () {
        const result = await contract.royaltyInfo(
          51,
          ethers.utils.parseUnits("1", "ether")
        );
        expect(result[0]).to.equal(fundRecipient.address);
        expect(result[1]).to.equal(ethers.utils.parseUnits("0.1", "ether"));
      });

      describe("when already activated", function () {
        it("reverts with ZBZ: Already activated", async function () {
          await expect(
            contract.activate(
              50,
              1000,
              "https://nft1.uri/",
              fundRecipient.address
            )
          ).to.be.revertedWith("ZBZ: Already activated");
        });
      });
    });

    describe("when caller is not admin", function () {
      it("reverts with AccessControl:", async function () {
        await expect(
          contract
            .connect(addrs[0])
            .activate(50, 1000, "https://nft1.uri/", addrs[1].address)
        ).to.be.revertedWith("AccessControl:");
      });
    });
  });

  describe("#mintTo(address toAddress, uint256 tokenId) external onlyAdmin", function () {
    let fundRecipient: any;

    beforeEach(async function () {
      fundRecipient = addrs[2];
      await contract.activate(
        50,
        1000,
        "https://nft.uri/",
        fundRecipient.address
      );
    });

    it("mints tokenID to toAddress", async function () {
      await contract.mintTo(addrs[1].address, 1);
      expect(await contract.ownerOf(1)).to.equal(addrs[1].address);
    });

    it("increases toAddress balance by 1", async function () {
      expect(await contract.balanceOf(addrs[1].address)).to.equal(0);
      await contract.mintTo(addrs[1].address, 1);
      expect(await contract.balanceOf(addrs[1].address)).to.equal(1);
      await contract.mintTo(addrs[1].address, 2);
      expect(await contract.balanceOf(addrs[1].address)).to.equal(2);
    });

    describe("when tokenId already minted", function () {
      it("reverts with ERC721: token already minted", async function () {
        await contract.mintTo(addrs[0].address, 1);
        await expect(contract.mintTo(addrs[0].address, 1)).to.be.revertedWith(
          "ERC721: token already minted"
        );
      });
    });

    describe("when tokenId is 0", function () {
      it("reverts with ZBZ: Invalid tokenId", async function () {
        await expect(contract.mintTo(addrs[0].address, 0)).to.be.revertedWith(
          "ZBZ: Invalid tokenId"
        );
      });
    });

    describe("when tokenId is greater than startIndex", function () {
      it("reverts with ZBZ: Invalid tokenId", async function () {
        await expect(contract.mintTo(addrs[0].address, 51)).to.be.revertedWith(
          "ZBZ: Invalid tokenId, must be index for reserving"
        );
      });
    });

    describe("when caller is not admin", function () {
      it("reverts with AccessControl:", async function () {
        await expect(
          contract.connect(addrs[0]).mintTo(addrs[0].address, 1)
        ).to.be.revertedWith("AccessControl:");
      });
    });
  });

  describe("#mint(uint256 salt, bytes memory sig) external nonReentrant payable", function () {
    let fundRecipient: any;

    // helpers
    async function mintCaller(minter: any, tokenID: any, proof?: any): Promise<any> {
      const salt = new Date().getTime();
      const orderHash = ethers.utils.solidityKeccak256(sigTypes, [
        minter.address,
        salt,
      ]);
      const sig = await owner.signMessage(ethers.utils.arrayify(orderHash));
      return contract.connect(minter).mint(tokenID, salt, sig, proof || [], {
        value: ethers.utils.parseUnits("0.8", "ether"),
      });
    }

    beforeEach(async function () {
      fundRecipient = addrs[2];
      await contract.activate(
        80,
        90,
        "https://nft.uri/",
        fundRecipient.address
      );
    });

    it("marks sig is finalized", async function () {
      const salt = new Date().getTime();
      const orderHash = ethers.utils.solidityKeccak256(sigTypes, [
        addrs[0].address,
        salt,
      ]);
      const sig = await owner.signMessage(ethers.utils.arrayify(orderHash));
      await contract.connect(addrs[0]).mint(81, salt, sig, [], {
        value: ethers.utils.parseUnits("0.8", "ether"),
      });
      expect(await contract.finalized(orderHash)).to.equal(true);
    });

    it("increases tokenIndex by 1", async function () {
      await mintCaller(addrs[0],81);
      expect(await contract.tokenURI(81)).to.equal("https://nft.uri/81");

      await mintCaller(addrs[1],82);
      expect(await contract.tokenURI(82)).to.equal("https://nft.uri/82");
    });

    it("sets right tokenURI minter balance", async function () {
      await expect(contract.tokenURI(81)).to.be.revertedWith("ERC721Metadata:");
      await mintCaller(addrs[1],81);
      expect(await contract.tokenURI(81)).to.equal("https://nft.uri/81");
    });

    it("increases minter balance by 1", async function () {
      expect(await contract.balanceOf(addrs[1].address)).to.equal(0);
      await mintCaller(addrs[1],81);
      expect(await contract.balanceOf(addrs[1].address)).to.equal(1);
      await mintCaller(addrs[1],82);
      expect(await contract.balanceOf(addrs[1].address)).to.equal(2);
    });

    it("sends funds to fundRecipient", async function () {
      const fundRecipientBalance = await fundRecipient.getBalance();
      await mintCaller(addrs[1],81);
      expect(await fundRecipient.getBalance()).to.equal(
        fundRecipientBalance.add(ethers.utils.parseUnits("0.8", "ether"))
      );
    });

    it("mints tokenID to minter", async function () {
      await mintCaller(addrs[1],81);
      expect(await contract.ownerOf(81)).to.equal(addrs[1].address);
    });

    describe("When minter mints VIP/KOLs tokenID", function () {
      it("Must be reverted ZBZ: Invalid tokenID, this tokenID is reserved", async function () {
      await expect(mintCaller(addrs[1],79)).to.be.revertedWith("ZBZ: Invalid tokenID, this tokenID is reserved");
      });
    });
    

    describe("when preSaleRoot exists", function () {
      let minter: any;
      let tree: any;

      beforeEach(async function () {
        minter = addrs[1];
        tree = new MerkleTree([minter.address, addrs[2].address], keccak256, {
          hashLeaves: true,
          sortPairs: true,
        });
        await contract.setPreSaleRoot(tree.getHexRoot());
      });

      describe("when valid proof", function () {
        it("mints tokenID to minter", async function () {
          await mintCaller(minter, 81, tree.getHexProof(keccak256(minter.address)));

          expect(await contract.ownerOf(81)).to.equal(minter.address);
        });

        describe("when minted is greater than MAX_PRESALE_PER_MINTER(is 2)", function () {
          it("reverts ZBZ: Can not mint", async function () {
            await mintCaller(
              minter, 81,
              tree.getHexProof(keccak256(minter.address))
            );
            await mintCaller(
              minter, 82,
              tree.getHexProof(keccak256(minter.address))
            );

            await expect(
              mintCaller(minter, 83, tree.getHexProof(keccak256(minter.address)))
            ).to.be.revertedWith("ZBZ: Can not mint");
          });
        });
      });

      describe("when proof is empty", function () {
        it("reverts ZBZ: Can not mint", async function () {
          await expect(mintCaller(minter, 81, [])).to.be.revertedWith(
            "ZBZ: Can not mint"
          );
        });
      });

      describe("when invalid proof", function () {
        it("reverts ZBZ: Can not mint", async function () {
          const leaves = [minter.address, addrs[2].address, addrs[3].address];
          const merkleTree = new MerkleTree(leaves, keccak256, {
            hashLeaves: true,
            sortPairs: true,
          });
          const leaf = keccak256(minter.address);
          const invalidProof = merkleTree.getHexProof(leaf);

          await expect(mintCaller(minter, 81, invalidProof)).to.be.revertedWith(
            "ZBZ: Can not mint"
          );
        });
      });

      describe("when set preSaleRoot is empty", function () {
        it("when call mint with empty proof, mints tokenID to minter", async function () {
          await contract.setPreSaleRoot(ethers.constants.HashZero);

          await mintCaller(minter,81);
          expect(await contract.ownerOf(81)).to.equal(minter.address);
        });
      });
    });

    describe("when value is less than UNIT_PRICE", function () {
      it("reverts ZBZ: Invalid amount", async function () {
        const minter = addrs[1];
        const salt = new Date().getTime();
        const orderHash = ethers.utils.solidityKeccak256(sigTypes, [
          minter.address,
          salt,
        ]);
        const sig = await owner.signMessage(ethers.utils.arrayify(orderHash));

        await expect(
          contract.connect(minter).mint(81, salt, sig, [], {
            value: ethers.utils.parseUnits("0.09", "ether"),
          })
        ).to.be.revertedWith("ZBZ: Invalid amount");
      });
    });

    describe("when minter mint a not exits tokenID", function () {
      it("reverts ZBZ: Reach total supply", async function () {
        await mintCaller(addrs[1],81);
        await mintCaller(addrs[2],82);
        await mintCaller(addrs[1],83);
        await mintCaller(addrs[2],84);
        await mintCaller(addrs[1],85);
        await mintCaller(addrs[2],86);
        await mintCaller(addrs[1],87);
        await mintCaller(addrs[2],88);
        await mintCaller(addrs[1],89);
        expect(await contract.ownerOf(89)).to.equal(addrs[1].address);
        await mintCaller(addrs[2],90);
        expect(await contract.ownerOf(90)).to.equal(addrs[2].address);

        await expect(mintCaller(addrs[1],91)).to.be.revertedWith(
          "ZBZ: This tokenID does not exits"
        );
      });
    });

    describe("when sig used", function () {
      it("reverts ZBZ: Salt Used", async function () {
        const minter = addrs[1];
        const salt = new Date().getTime();
        const orderHash = ethers.utils.solidityKeccak256(sigTypes, [
          minter.address,
          salt,
        ]);
        const sig = await owner.signMessage(ethers.utils.arrayify(orderHash));

        await contract.connect(minter).mint(81, salt, sig, [], {
          value: ethers.utils.parseUnits("0.8", "ether"),
        });
        expect(await contract.ownerOf(81)).to.equal(minter.address);

        await expect(
          contract.connect(minter).mint(82, salt, sig, [], {
            value: ethers.utils.parseUnits("0.8", "ether"),
          })
        ).to.be.revertedWith("ZBZ: Salt used");
      });
    });

    describe("when sig recover is not a verifier", function () {
      it("reverts ZBZ: Unauthorized", async function () {
        const minter = addrs[1];
        const salt = new Date().getTime();
        const orderHash = ethers.utils.solidityKeccak256(sigTypes, [
          minter.address,
          salt,
        ]);
        const sig = await addrs[0].signMessage(
          ethers.utils.arrayify(orderHash)
        );

        await expect(
          contract.connect(minter).mint(81, salt, sig, [], {
            value: ethers.utils.parseUnits("0.8", "ether"),
          })
        ).to.be.revertedWith("ZBZ: Unauthorized");
      });
    });
  });
});