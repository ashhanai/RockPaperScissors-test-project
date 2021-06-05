const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require('@openzeppelin/test-helpers');

describe("RockPaperScissors contract", () => {
	let Contract, contract, Token, token, owner, player1, player2;

	const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("1_secret"));

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
			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			let game = await contract.games(player1.address, player2.address);
			expect(game.stake).to.equal(10);
			expect(game.secretMove).to.equal(hash);
			expect(game.move).to.equal(0);
			expect(game.state).to.equal(1);
		});

		it("should fail if challanging another game with same player", async () => {
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

			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			expect(await token.balanceOf(contract.address)).to.equal(10);
		});

		it("should emit Challenge event", async () => {
			await token.connect(player1).approve(contract.address, 10);
			const tx = await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			const receipt = await tx.wait();
			const event = receipt.events[receipt.events.length - 1];
			expect(event.event).to.equal("Challenge");
			expect(event.args._challenger).to.equal(player1.address);
			expect(event.args._challenged).to.equal(player2.address);
			expect(event.args._stake).to.equal(10);
		});

	});

	describe("Play move", () => {

		it("should fail if no game in progress", async () => {
			try {
				await token.connect(player2).approve(contract.address, 10);
				await contract.connect(player2).playMove(player1.address, 2);
				expect.fail();
			} catch(error) {
				expect(error.message.indexOf("revert No challenged game in progress")).to.be.at.least(0);
			}
		});

		it("should fail if played game in progress", async () => {
			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			await token.connect(player2).approve(contract.address, 10);
			await contract.connect(player2).playMove(player1.address, 2);

			try {
				await token.connect(player2).approve(contract.address, 10);
				await contract.connect(player2).playMove(player1.address, 2);
				expect.fail();
			} catch(error) {
				expect(error.message.indexOf("revert No challenged game in progress")).to.be.at.least(0);
			}
		});

		it("should transfer staked tokens to contract", async () => {
			expect(await token.balanceOf(contract.address)).to.equal(0);

			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			await token.connect(player2).approve(contract.address, 10);
			await contract.connect(player2).playMove(player1.address, 2);

			expect(await token.balanceOf(contract.address)).to.equal(20);
		});

		it("should update game", async () => {
			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			await token.connect(player2).approve(contract.address, 10);
			await contract.connect(player2).playMove(player1.address, 2);

			let game = await contract.games(player1.address, player2.address);
			expect(game.stake).to.equal(10);
			expect(game.secretMove).to.equal(hash);
			expect(game.move).to.equal(2);
			expect(game.state).to.equal(3);
		});

		it("should emit Play event", async () => {
			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			await token.connect(player2).approve(contract.address, 10);
			const tx = await contract.connect(player2).playMove(player1.address, 2);

			const receipt = await tx.wait();
			const event = receipt.events[receipt.events.length - 1];
			expect(event.event).to.equal("Play");
			expect(event.args._challenger).to.equal(player1.address);
			expect(event.args._challenged).to.equal(player2.address);
			expect(event.args._move).to.equal(2);
		});

	});

	describe("Reveal move", () => {

		it("should fail if no game in progress", async () => {
			try {
				await contract.connect(player1).revealMove(player2.address, 1, "secret");
				expect.fail();
			} catch(error) {
				expect(error.message.indexOf("revert No played game in progress")).to.be.at.least(0);
			}
		});

		it("should fail if challenged game in progress", async () => {
			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			try {
				await contract.connect(player1).revealMove(player2.address, 1, "secret");
				expect.fail();
			} catch(error) {
				expect(error.message.indexOf("revert No played game in progress")).to.be.at.least(0);
			}
		});

		it("should pass if played game in progress", async () => {
			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			await token.connect(player2).approve(contract.address, 10);
			await contract.connect(player2).playMove(player1.address, 2);

			await contract.connect(player1).revealMove(player2.address, 1, "secret");
		});

		it("should fail if revealed move is not mathing", async () => {
			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			await token.connect(player2).approve(contract.address, 10);
			await contract.connect(player2).playMove(player1.address, 2);

			try {
				await contract.connect(player1).revealMove(player2.address, 2, "secret");
				expect.fail();
			} catch(error) {
				expect(error.message.indexOf("revert Move and secret do not match secret move")).to.be.at.least(0);
			}
		});

		it("should fail if revealed secret is not mathing", async () => {
			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			await token.connect(player2).approve(contract.address, 10);
			await contract.connect(player2).playMove(player1.address, 2);

			try {
				await contract.connect(player1).revealMove(player2.address, 1, "fake_secret");
				expect.fail();
			} catch(error) {
				expect(error.message.indexOf("revert Move and secret do not match secret move")).to.be.at.least(0);
			}
		});

		const tests = [
			{ move1: 1, move2: 1, price1: 1, price2: 1 },
			{ move1: 1, move2: 2, price1: 0, price2: 2 },
			{ move1: 1, move2: 3, price1: 2, price2: 0 },
			{ move1: 2, move2: 1, price1: 2, price2: 0 },
			{ move1: 2, move2: 2, price1: 1, price2: 1 },
			{ move1: 2, move2: 3, price1: 0, price2: 2 },
			{ move1: 3, move2: 1, price1: 0, price2: 2 },
			{ move1: 3, move2: 2, price1: 2, price2: 0 },
			{ move1: 3, move2: 3, price1: 1, price2: 1 }
		]

		const moveName = ((move) => {
			if (move == 1) { return "rock"; }
			if (move == 2) { return "paper"; }
			if (move == 3) { return "scissors"; }
			return "unknown";
		});

		tests.forEach((test) => {
			it("should evalute " + moveName(test.move1) + ":" + moveName(test.move2) + " correctly", async () => {
				let hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(test.move1.toString() + "_secret"));
				let stake = 10;
				await token.connect(player1).approve(contract.address, stake);
				await contract.connect(player1).challengePlayer(player2.address, stake, hash);

				await token.connect(player2).approve(contract.address, stake);
				await contract.connect(player2).playMove(player1.address, test.move2);

				let balance = 100-stake;
				expect(await token.balanceOf(player1.address)).to.equal(balance);
				expect(await token.balanceOf(player2.address)).to.equal(balance);

				await contract.connect(player1).revealMove(player2.address, test.move1, "secret");

				expect(await token.balanceOf(player1.address)).to.equal(balance + stake * test.price1);
				expect(await token.balanceOf(player2.address)).to.equal(balance + stake * test.price2);
			});
		});

		it("should update game state", async () => {
			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			await token.connect(player2).approve(contract.address, 10);
			await contract.connect(player2).playMove(player1.address, 2);

			await contract.connect(player1).revealMove(player2.address, 1, "secret");

			let game = await contract.games(player1.address, player2.address);
			expect(game.state).to.equal(5);
		});

		it("should emit Finish event", async () => {
			await token.connect(player1).approve(contract.address, 10);
			await contract.connect(player1).challengePlayer(player2.address, 10, hash);

			await token.connect(player2).approve(contract.address, 10);
			await contract.connect(player2).playMove(player1.address, 2);

			const tx = await contract.connect(player1).revealMove(player2.address, 1, "secret");

			const receipt = await tx.wait();
			const event = receipt.events[receipt.events.length - 1];
			expect(event.event).to.equal("Finish");
			expect(event.args._challenger).to.equal(player1.address);
			expect(event.args._challenged).to.equal(player2.address);
			expect(event.args._move).to.equal(1);
			expect(event.args._result).to.equal(2);
		});

	});

	describe("Withdraw", () => {

		describe("As challenger", () => {

			it("should fail when no challenged game in progress", async () => {
				try {
					await contract.connect(player1).withdraw(player2.address, true);
					expect.fail();
				} catch(error) {
					expect(error.message.indexOf("revert No challenged game in progress")).to.be.at.least(0);
				}
			});

			it("should fail when did not exceed round time", async () => {
				await token.connect(player1).approve(contract.address, 10);
				await contract.connect(player1).challengePlayer(player2.address, 10, hash);

				time.increase(20 * 60);

				try {
					await contract.connect(player1).withdraw(player2.address, true);
					expect.fail();
				} catch(error) {
					expect(error.message.indexOf("revert Cannot withdraw staked tokens yet")).to.be.at.least(0);
				}
			});

			it("should transfer staked tokens to challenger", async () => {
				await token.connect(player1).approve(contract.address, 10);
				await contract.connect(player1).challengePlayer(player2.address, 10, hash);

				expect(await token.balanceOf(player1.address)).to.equal(90);
				
				time.increase(40 * 60);

				await contract.connect(player1).withdraw(player2.address, true);

				expect(await token.balanceOf(player1.address)).to.equal(100);
			});

			it("should update game state", async () => {
				await token.connect(player1).approve(contract.address, 10);
				await contract.connect(player1).challengePlayer(player2.address, 10, hash);

				time.increase(40 * 60);

				await contract.connect(player1).withdraw(player2.address, true);

				let game = await contract.games(player1.address, player2.address);
				expect(game.state).to.equal(2);
			});

			it("should emit ChallengerWithdraw event", async () => {
				await token.connect(player1).approve(contract.address, 10);
				await contract.connect(player1).challengePlayer(player2.address, 10, hash);

				time.increase(40 * 60);

				const tx = await contract.connect(player1).withdraw(player2.address, true);

				const receipt = await tx.wait();
				const event = receipt.events[receipt.events.length - 1];
				expect(event.event).to.equal("ChallengerWithdraw");
				expect(event.args._challenger).to.equal(player1.address);
				expect(event.args._challenged).to.equal(player2.address);
			});

		});

		describe("As challenged", () => {

			it("should fail when no game in progress", async () => {
				try {
					await contract.connect(player2).withdraw(player1.address, false);
					expect.fail();
				} catch(error) {
					expect(error.message.indexOf("revert No played game in progress")).to.be.at.least(0);
				}
			});

			it("should fail when no played game in progress", async () => {
				await token.connect(player1).approve(contract.address, 10);
				await contract.connect(player1).challengePlayer(player2.address, 10, hash);

				try {
					await contract.connect(player2).withdraw(player1.address, false);
					expect.fail();
				} catch(error) {
					expect(error.message.indexOf("revert No played game in progress")).to.be.at.least(0);
				}
			});

			it("should fail when did not exceed round time", async () => {
				await token.connect(player1).approve(contract.address, 10);
				await contract.connect(player1).challengePlayer(player2.address, 10, hash);

				await token.connect(player2).approve(contract.address, 10);
				await contract.connect(player2).playMove(player1.address, 2);

				time.increase(20 * 60);

				try {
					await contract.connect(player2).withdraw(player1.address, false);
					expect.fail();
				} catch(error) {
					expect(error.message.indexOf("revert Cannot withdraw staked tokens yet")).to.be.at.least(0);
				}
			});

			it("should transfer all staked tokens to challenged player", async () => {
				await token.connect(player1).approve(contract.address, 10);
				await contract.connect(player1).challengePlayer(player2.address, 10, hash);

				await token.connect(player2).approve(contract.address, 10);
				await contract.connect(player2).playMove(player1.address, 2);

				expect(await token.balanceOf(player2.address)).to.equal(90);
				
				time.increase(40 * 60);

				await contract.connect(player2).withdraw(player1.address, false);

				expect(await token.balanceOf(player2.address)).to.equal(110);
			});

			it("should update game state", async () => {
				await token.connect(player1).approve(contract.address, 10);
				await contract.connect(player1).challengePlayer(player2.address, 10, hash);

				await token.connect(player2).approve(contract.address, 10);
				await contract.connect(player2).playMove(player1.address, 2);

				time.increase(40 * 60);

				await contract.connect(player2).withdraw(player1.address, false);

				let game = await contract.games(player1.address, player2.address);
				expect(game.state).to.equal(4);
			});

			it("should emit ChallengedWithdraw event", async () => {
				await token.connect(player1).approve(contract.address, 10);
				await contract.connect(player1).challengePlayer(player2.address, 10, hash);

				await token.connect(player2).approve(contract.address, 10);
				await contract.connect(player2).playMove(player1.address, 2);

				time.increase(40 * 60);

				const tx = await contract.connect(player2).withdraw(player1.address, false);

				const receipt = await tx.wait();
				const event = receipt.events[receipt.events.length - 1];
				expect(event.event).to.equal("ChallengedWithdraw");
			});

		});

	});

});
