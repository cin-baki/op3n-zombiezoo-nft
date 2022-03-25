import hre = require("hardhat");

async function main() {
  const contractClass = "ZombiezooNFT";
  const contractFactory = await hre.ethers.getContractFactory(contractClass);

  const contract = await contractFactory.deploy();
  await contract.deployed();

  const [owner] = await hre.ethers.getSigners();
  await contract.activate(50, 1000, "tokenURI", owner.address);

  console.log(contractClass, contract.address);
  console.log("-----------------Verify Contract-----------------");
  console.log(
    "hh verify",
    contract.address,
    "--contract contracts/" +
      contractClass +
      ".sol:" +
      contractClass +
      " --network",
    hre.network.name
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
