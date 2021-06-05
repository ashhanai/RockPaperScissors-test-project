// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract AshhabToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Ashhab", "ASHH") {
        _mint(msg.sender, initialSupply);
    }
}
