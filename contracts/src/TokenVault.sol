// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "./libs/CCIPUtil.sol";

interface ICCIPRouter {
    function ccipSend(
        uint64 dstChainSelector,
        bytes calldata message
    ) external payable returns (bytes32);
}

contract TokenVault is Pausable, ReentrancyGuard, Ownable2Step {
    using SafeERC20 for IERC20;

    event Locked(
        address indexed token,
        address indexed from,
        uint256 amount,
        address indexed to,
        uint64 dstChain,
        bytes32 msgId
    );
    event Unlocked(address indexed token, address indexed to, uint256 amount);

    struct Peer {
        address receiver;
        bool allowed;
    }
    mapping(uint64 => Peer) public peers; // chainSelector → BridgeReceiver
    mapping(address => bool) public tokenAllowlist; // canonical ERC20s allowed

    ICCIPRouter public immutable router;
    address public feeCollector;

    // ✅ Pass initial owner to Ownable (via Ownable2Step -> Ownable)
    constructor(address router_, address initialOwner) Ownable(initialOwner) {
        router = ICCIPRouter(router_);
    }

    function setPeer(
        uint64 chain,
        address receiver,
        bool allowed
    ) external onlyOwner {
        peers[chain] = Peer(receiver, allowed);
    }

    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        tokenAllowlist[token] = allowed;
    }

    function setFeeCollector(address f) external onlyOwner {
        feeCollector = f;
    }

    function lockAndBridge(
        address token,
        uint256 amount,
        address to,
        uint64 dstChain
    ) external payable whenNotPaused nonReentrant {
        require(tokenAllowlist[token], "TOKEN_NOT_ALLOWED");
        Peer memory p = peers[dstChain];
        require(p.allowed && p.receiver != address(0), "PEER_NOT_SET");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        bytes memory payload = CCIPUtil.encode(
            CCIPUtil.Payload({token: token, to: to, amount: amount})
        );
        bytes32 msgId = router.ccipSend(
            dstChain,
            abi.encode(p.receiver, payload)
        );

        emit Locked(token, msg.sender, amount, to, dstChain, msgId);

        if (feeCollector != address(0) && msg.value > 0)
            payable(feeCollector).transfer(msg.value);
    }

    function unlock(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
        emit Unlocked(token, to, amount);
    }
}
