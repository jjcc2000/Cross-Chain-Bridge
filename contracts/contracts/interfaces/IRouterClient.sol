// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";


interface IRouterClient {
    /// @notice Request a CCIP message to be sent to the destination chain
    /// @param destinationChainSelector The destination chain selector
    /// @param message The cross-chain CCIP message including data and/or tokens
    /// @return messageId The message ID
    function ccipSend(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage calldata message
    ) external payable returns (bytes32 messageId);
}
