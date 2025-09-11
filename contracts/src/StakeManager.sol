// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract StakeManager is Ownable, Pausable, ReentrancyGuard {
    mapping(address => uint256) public stakeOf;
    mapping(address => uint256) public lastActionAt;

    event Staked(address indexed relayer, uint256 amount);
    event Unstaked(address indexed relayer, uint256 amount);
    event Slashed(address indexed relayer, uint256 amount, bytes32 reason);
    event MinStakeSet(uint256 oldValue, uint256 newValue);

    uint256 public constant COOLDOWN_PERIOD = 1 days;
    uint256 public minStake = 0.1 ether;

    constructor(address initialOwner) Ownable(initialOwner) {}

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setMinStake(uint256 newMin) external onlyOwner {
        emit MinStakeSet(minStake, newMin);
        minStake = newMin;
    }

    function stake() external payable whenNotPaused {
        require(msg.value >= minStake, "STAKE_TOO_LOW");
        stakeOf[msg.sender] += msg.value;
        // Start cooldown window immediately after staking
        lastActionAt[msg.sender] = block.timestamp;
        emit Staked(msg.sender, msg.value);
    }

    function unstake(uint256 amount) external whenNotPaused nonReentrant {
        require(stakeOf[msg.sender] >= amount, "INSUFFICIENT");
        require(
            block.timestamp >= lastActionAt[msg.sender] + COOLDOWN_PERIOD,
            "COOLDOWN_ACTIVE"
        );

        stakeOf[msg.sender] -= amount;
        // Reset cooldown after an unstake too (optional but consistent)
        lastActionAt[msg.sender] = block.timestamp;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "SEND_FAIL");
        emit Unstaked(msg.sender, amount);
    }

    function slash(
        address relayer,
        uint256 amount,
        bytes32 reason
    ) external onlyOwner nonReentrant {
        require(stakeOf[relayer] >= amount, "INSUFFICIENT");
        stakeOf[relayer] -= amount;

        (bool ok, ) = owner().call{value: amount}("");
        require(ok, "SEND_FAIL");
        emit Slashed(relayer, amount, reason);
    }
}
