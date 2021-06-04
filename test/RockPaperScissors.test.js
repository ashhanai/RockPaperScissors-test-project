const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RockPaperScissors contract", () => {
	let Contract, contract, Token, token, owner, player1, player2;

	beforeEach(async () => {
		Token = await ethers.getContractFactory("AshhabToken");
		token = await Token.deploy(1000);
		Contract = await ethers.getContractFactory("RockPaperScissors");
		contract = await Contract.deploy(token.address);
		[owner, player1, player2] = await ethers.getSigners();
		await token.transfer(player1.address, 100);
		await token.transfer(player2.address, 100);
	});

	describe("Challange player", () => {
		it("should accept valid challenge", async () => {
			let hash = ethers.utils.hashMessage("0_secret");
			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			let game = await contract.games(player1.address, player2.address);
			expect(game.stake).to.equal(10);
			expect(game.secretMove).to.equal(hash);
			expect(game.move).to.equal(0);
			expect(game.state).to.equal(1);
		});

		it("should fail if challanging another game with same player", async () => {
			let hash = ethers.utils.hashMessage("0_secret");
			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);
					
			try {
				await token.connect(player1).approve(contract.address, 30);
				await contract.connect(player1).challengePlayer(player2.address, 30, hash);
				expect.fail();
			} catch(error) {
				expect(error.message.indexOf("revert Another challange in progress")).to.be.at.least(0);
			}
		});

		it("should transfer staked tokens to contract", async () => {
			expect(await token.balanceOf(contract.address)).to.equal(0);
			
			let hash = ethers.utils.hashMessage("0_secret");
			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			expect(await token.balanceOf(contract.address)).to.equal(10);
		});
	});
});
