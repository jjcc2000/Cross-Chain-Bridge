// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./libs/CCIPUtil.sol";

interface ICCIPReceiver {
    function ccipReceive(bytes calldata message) external;
}

interface ICCIPRouter {
    function ccipSend(
        uint64 dstChainSelector,
        bytes calldata message
    ) external payable returns (bytes32);
}

contract TokenVault is Pausable, ReentrancyGuard, Ownable2Step, ICCIPReceiver {
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
    event PeerSet(uint64 indexed chain, address indexed receiver, bool allowed);
    event TokenAllowed(address indexed token, bool allowed);
    event FeeCollectorSet(address indexed feeCollector);

    // ====== Types / Storage ======
    struct Peer {
        address receiver; // remote BridgeReceiver (source or destination depending on use)
        bool allowed;
    }

    ICCIPRouter public immutable router;
    address public feeCollector;

    // dstChainSelector => Peer (for sending)
    mapping(uint64 => Peer) public peers;

    // canonical ERC20 allowlist
    mapping(address => bool) public tokenAllowlist;

    // replay protection for received messages
    mapping(bytes32 => bool) public processed;

    // ====== Constructor ======
    // Ownable2Step -> Ownable: pass initial owner
    constructor(address router_, address initialOwner) Ownable(initialOwner) {
        require(router_ != address(0), "ROUTER_0");
        router = ICCIPRouter(router_);
    }

    // ====== Modifiers ======
    modifier onlyRouter() {
        require(msg.sender == address(router), "NOT_ROUTER");
        _;
    }

    // ====== Admin ======
    function setPeer(
        uint64 chain,
        address receiver,
        bool allowed
    ) external onlyOwner {
        peers[chain] = Peer(receiver, allowed);
        emit PeerSet(chain, receiver, allowed);
    }

    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        tokenAllowlist[token] = allowed;
        emit TokenAllowed(token, allowed);
    }

    function setFeeCollector(address f) external onlyOwner {
        require(f != address(0), "Collector=0");
        feeCollector = f;
        emit FeeCollectorSet(f);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ====== Lock & Bridge (send path) ======
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

        // Forward ALL msg.value to the router (protocol fee). If you need a platform fee,
        // split it out explicitly before this call.
        bytes32 msgId = router.ccipSend{value: msg.value}(
            dstChain,
            abi.encode(p.receiver, payload)
        );

        emit Locked(token, msg.sender, amount, to, dstChain, msgId);
    }

    // ====== Receive & Unlock (receive path) ======
    // message = abi.encode(
    //   uint64 srcChainSelector,
    //   address srcSender /*BridgeReceiver on src*/,
    //   bytes32 msgId,
    //   bytes   payloadBytes // CCIPUtil.encode(CCIPUtil.Payload({token,to,amount}))
    // )
    function ccipReceive(
        bytes calldata message
    ) external onlyRouter whenNotPaused {
        (
            uint64 srcChain,
            address srcSender,
            bytes32 msgId,
            bytes memory payloadBytes
        ) = abi.decode(message, (uint64, address, bytes32, bytes));

        // source must be the configured peer for srcChain
        Peer memory p = peers[srcChain];
        require(p.allowed && p.receiver == srcSender, "SRC_NOT_ALLOWED");

        // replay protection
        require(!processed[msgId], "REPLAY");
        processed[msgId] = true;

        // decode + allowlist check
        CCIPUtil.Payload memory pld = CCIPUtil.decode(payloadBytes);
        require(tokenAllowlist[pld.token], "TOKEN_NOT_ALLOWED");

        // perform unlock
        IERC20(pld.token).safeTransfer(pld.to, pld.amount);
        emit Unlocked(pld.token, pld.to, pld.amount);
    }
}
