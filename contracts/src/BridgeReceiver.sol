// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "./interfaces/IBridgedERC20.sol";
import "./libs/CCIPUtil.sol";

/// @notice Destination-chain endpoint: validates router + payload, then mints bridged tokens.
contract BridgeReceiver is Ownable, Pausable {
    address public trustedRouter; // CCIP router on this chain
    mapping(uint64 => mapping(address => bool)) public isAllowedSource;
    mapping(address => bool) public allowedBridgedTokens;
    mapping(bytes32 => bool) public processed;
    mapping(address => address) public canonicalToBridged;

    event CanonicalMapped(
        address indexed canonical,
        address indexed bridged,
        bool allowed
    );

    event RouterSet(address indexed router);
    event BridgedTokenSet(address indexed token, bool allowed);
    event SourceAllowed(
        uint64 indexed srcChain,
        address indexed srcSender,
        bool allowed
    );
    event MessageProcessed(
        bytes32 indexed messageId,
        address indexed token,
        address indexed to,
        uint256 amount
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    modifier onlyRouter() {
        require(msg.sender == trustedRouter, "NOT_ROUTER");
        _;
    }

    function setAllowedSource(
        uint64 srcChain,
        address srcSender,
        bool allowed
    ) external onlyOwner {
        isAllowedSource[srcChain][srcSender] = allowed;
    }

    function setRouter(address r) external onlyOwner {
        require(r != address(0), "Router=0");
        trustedRouter = r;
        emit RouterSet(r);
    }

    function setBridgedToken(address t, bool allowed) external onlyOwner {
        allowedBridgedTokens[t] = allowed;
        emit BridgedTokenSet(t, allowed);
    }

    /// @dev message = abi.encode(receiverAddr, abi.encode(CCIPUtil.Payload{token,to,amount}))
    function ccipReceive(
        bytes calldata message
    ) external onlyRouter whenNotPaused {
        // Router forwards exactly what the vault sent:
        // abi.encode(dstReceiver, payloadBytes)
        (address supposedReceiver, bytes memory payloadBytes) = abi.decode(
            message,
            (address, bytes)
        );

        require(supposedReceiver == address(this), "WRONG_RECEIVER");

        CCIPUtil.Payload memory p = CCIPUtil.decode(payloadBytes);

        address bridged = canonicalToBridged[p.token];
        require(bridged != address(0), "MAP_MISSING");

        IBridgedERC20(bridged).mint(p.to, p.amount);
    }

    function setCanonicalMapping(
        address canonical,
        address bridged,
        bool allowed
    ) external onlyOwner {
        // optional: also maintain allowedBridgedTokens[bridged] = allowed;
        if (allowed) {
            canonicalToBridged[canonical] = bridged;
        } else {
            canonicalToBridged[canonical] = address(0);
        }
        allowedBridgedTokens[bridged] = allowed;
        emit CanonicalMapped(canonical, bridged, allowed);
    }
}
