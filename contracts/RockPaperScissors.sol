//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RockPaperScissors {
	IERC20 public token;
	uint public roundTime = 5 minutes;

	enum Move { None, Rock, Paper, Scissor }
	enum State { NoGame, Challenged, ChallengeWithdrawed, Played, Unrevealed, Finished }

	struct Game {
		uint lastUpdate;
		uint stake;
		bytes32 secretMove;
		Move move;
		State state;
	}

	mapping(address => mapping(address => Game)) public games;

	// TODO: Add events


	// Public functions

	constructor(address _token) {
		token = IERC20(_token);
	}

	function challengePlayer(address _player2, uint _stake, bytes32 _secretMove) public {
		require(!isGameInProgress(games[msg.sender][_player2]), "Another challange in progress");
		require(token.transferFrom(msg.sender, address(this), _stake), "Token transfer failed");

		games[msg.sender][_player2] = Game({
			lastUpdate: block.timestamp,
			stake: _stake,
			secretMove: _secretMove,
			move: Move.None,
			state: State.Challenged
		});
	}

	function playMove(address _player1, Move _move) public {
		Game storage game = games[_player1][msg.sender];
		require(isGameInProgress(game), "No game in progress");
		require(token.transferFrom(msg.sender, address(this), game.stake), "Token transfer failed");

		game.move = _move;
		game.lastUpdate = block.timestamp;
		game.state = State.Played;
	}

	function revealMove(address _player2, string memory _secret) public {
		// 1. Check that game is created
		// 2. Check that move is within round limit (5 min)
		// 3. Reveal player 1 move
		// 4. Evaulate result
		// 5. Send staked tokens to winner
		// 6. Update the game
	}

	function withdraw(address _player) public {
		// 1. Check that game is created and over round limit
		// 2. If player is challanger and game is in Challanged state, send his/her staked tokens
		// 3. If player is challanged and game is in Played state, send all staked tokens
		// 4. Update game
	}


	// Private functions

	function isGameInProgress(Game memory _game) private pure returns (bool inProgress) {
		inProgress = _game.state == State.Challenged || _game.state == State.Played;
	}

}
