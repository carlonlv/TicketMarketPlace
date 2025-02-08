// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract SampleCoin is ERC20 {
    constructor() ERC20("SampleCoin", "SCN") {
        // Mint 1,000,000 tokens to the deployer
        _mint(msg.sender, 100 * 10 ** decimals());
    }
}
