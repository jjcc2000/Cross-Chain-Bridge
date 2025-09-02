// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IBridgedERC20.sol";
import "./libs/CCIPUtil.sol";

interface ICCIPReceiver { function ccipReceive(bytes calldata message) external; }

/// @notice Destination-chain endpoint: validates router + payload, then mints bridged tokens.
contract BridgeReceiver is Ownable, ICCIPReceiver {
    address public trustedRouter;                    // CCIP router on this chain
    mapping(address => bool) public allowedBridgedTokens;

    event RouterSet(address indexed router);
    event BridgedTokenSet(address indexed token, bool allowed);

    // ✅ OZ v5: Ownable requires initial owner
    constructor(address initialOwner) Ownable(initialOwner) {}

    modifier onlyRouter() { require(msg.sender == trustedRouter, "NOT_ROUTER"); _; }

    function setRouter(address r) external onlyOwner {
        trustedRouter = r; emit RouterSet(r);
    }

    function setBridgedToken(address t, bool allowed) external onlyOwner {
        allowedBridgedTokens[t] = allowed; emit BridgedTokenSet(t, allowed);
    }

    /// @dev message = abi.encode(receiverAddr, abi.encode(CCIPUtil.Payload{token,to,amount}))
    function ccipReceive(bytes calldata message) external onlyRouter {
        (address supposedReceiver, bytes memory payloadBytes) =
            abi.decode(message, (address, bytes));
        require(supposedReceiver == address(this), "WRONG_RECEIVER");

        CCIPUtil.Payload memory p = CCIPUtil.decode(payloadBytes);
        require(allowedBridgedTokens[p.token], "TOKEN_NOT_ALLOWED");
        IBridgedERC20(p.token).mint(p.to, p.amount);
    }
}
