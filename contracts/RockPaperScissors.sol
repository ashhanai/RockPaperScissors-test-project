//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RockPaperScissors {
	IERC20 public token;
	uint public roundTime = 30 minutes;

	enum Move { None, Rock, Paper, Scissor }
	enum State { NoGame, Challenged, ChallengeWithdrawed, Played, Unrevealed, Finished }
	enum Result { Tie, Win, Lose }

	struct Game {
		uint lastUpdate;
		uint stake;
		bytes32 secretMove;
		Move move;
		State state;
	}

	mapping(address => mapping(address => Game)) public games;

	event Challenge(
		address indexed _challenger,
		address indexed _challenged,
		uint _stake
	);

	event ChallengerWithdraw(
		address indexed _challenger,
		address indexed _challenged
	);

	event Play(
		address indexed _challenger,
		address indexed _challenged,
		Move _move
	);

	event ChallengedWithdraw(
		address indexed _challenger,
		address indexed _challenged
	);

	event Finish(
		address indexed _challenger,
		address indexed _challenged,
		Move _move,
		Result _result
	);


	// Public functions

	constructor(address _token) {
		token = IERC20(_token);
	}

	function challengePlayer(address _player2, uint _stake, bytes32 _secretMove) public {
		Game memory game = games[msg.sender][_player2];
		require(game.state != State.Challenged && game.state != State.Played, "Another challange in progress");
		require(token.transferFrom(msg.sender, address(this), _stake), "Token transfer failed");

		games[msg.sender][_player2] = Game({
			lastUpdate: block.timestamp,
			stake: _stake,
			secretMove: _secretMove,
			move: Move.None,
			state: State.Challenged
		});

		emit Challenge(msg.sender, _player2, _stake);
	}

	function playMove(address _player1, Move _move) public {
		Game storage game = games[_player1][msg.sender];
		require(game.state == State.Challenged, "No challenged game in progress");
		require(token.transferFrom(msg.sender, address(this), game.stake), "Token transfer failed");

		game.move = _move;
		game.lastUpdate = block.timestamp;
		game.state = State.Played;

		emit Play(_player1, msg.sender, _move);
	}

	function revealMove(address _player2, Move _move, string memory _secret) public {
		Game storage game = games[msg.sender][_player2];
		require(game.state == State.Played, "No played game in progress");
		require(game.secretMove == keccak256(abi.encodePacked(moveToString(_move), "_", _secret)), "Move and secret do not match secret move");

		Result result = evaluateResult(_move, game.move);

		if (result == Result.Win) {
			token.transfer(msg.sender, game.stake * 2);
		} else if (result == Result.Lose) {
			token.transfer(_player2, game.stake * 2);
		} else if (result == Result.Tie) {
			token.transfer(msg.sender, game.stake);
			token.transfer(_player2, game.stake);
		}

		game.state = State.Finished;
		game.lastUpdate = block.timestamp;

		emit Finish(msg.sender, _player2, _move, result);
	}

	function withdraw(address _player, bool _isChallenger) public {
		_isChallenger ? withdrawAsChallenger(_player) : withdrawAsChallenged(_player);
	}


	// Private functions

	function evaluateResult(Move _move1, Move _move2) private pure returns (Result) {
		if (_move1 == _move2) 
			return Result.Tie;
		
		if (_move1 == Move.None)
			return Result.Lose;
		
		if (uint(_move1) % 3 == uint(_move2) - 1)
			return Result.Lose;

		return Result.Win;
	}

	function moveToString(Move _move) private pure returns (string memory) {
		if (_move == Move.None)
			return "0";
		if (_move == Move.Rock)
			return "1";
		if (_move == Move.Paper)
			return "2";
		if (_move == Move.Scissor)
			return "3";
		return "";
	}

	function withdrawAsChallenger(address _player2) private {
		Game storage game = games[msg.sender][_player2];
		require(game.state == State.Challenged, "No challenged game in progress");
		require(game.lastUpdate + roundTime < block.timestamp, "Cannot withdraw staked tokens yet");

		token.transfer(msg.sender, game.stake);

		game.state = State.ChallengeWithdrawed;
		game.lastUpdate = block.timestamp;

		emit ChallengerWithdraw(msg.sender, _player2);
	}

	function withdrawAsChallenged(address _player1) private {
		Game storage game = games[_player1][msg.sender];
		require(game.state == State.Played, "No played game in progress");
		require(game.lastUpdate + roundTime < block.timestamp, "Cannot withdraw staked tokens yet");

		token.transfer(msg.sender, game.stake * 2);

		game.state = State.Unrevealed;
		game.lastUpdate = block.timestamp;

		emit ChallengedWithdraw(_player1, msg.sender);
	}

}
