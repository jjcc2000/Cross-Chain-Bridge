// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library CCIPUtil {
    struct Payload { address token; address to; uint256 amount; }

    function encode(Payload memory p) internal pure returns (bytes memory) {
        return abi.encode(p.token, p.to, p.amount);
    }

    function decode(bytes memory data) internal pure returns (Payload memory p) {
        (p.token, p.to, p.amount) = abi.decode(data, (address, address, uint256));
    }
}
