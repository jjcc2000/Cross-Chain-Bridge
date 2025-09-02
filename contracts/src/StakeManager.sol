// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract StakeManager is Ownable {
    mapping(address => uint256) public stakeOf;

    event Staked(address indexed relayer, uint256 amount);
    event Unstaked(address indexed relayer, uint256 amount);
    event Slashed(address indexed relayer, uint256 amount, bytes32 reason);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function stake() external payable {
        require(msg.value > 0, "NO_VALUE");
        stakeOf[msg.sender] += msg.value;
        emit Staked(msg.sender, msg.value);
    }

    function unstake(uint256 amount) external {
        require(stakeOf[msg.sender] >= amount, "INSUFFICIENT");
        stakeOf[msg.sender] -= amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "SEND_FAIL");
        emit Unstaked(msg.sender, amount);
    }

    function slash(address relayer, uint256 amount, bytes32 reason) external onlyOwner {
        require(stakeOf[relayer] >= amount, "INSUFFICIENT");
        stakeOf[relayer] -= amount;
        (bool ok,) = owner().call{value: amount}("");
        require(ok, "SEND_FAIL");
        emit Slashed(relayer, amount, reason);
    }
}
