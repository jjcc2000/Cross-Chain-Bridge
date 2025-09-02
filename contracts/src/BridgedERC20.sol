// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract BridgedERC20 is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint8 private _customDecimals;

    event MinterUpdated(address indexed minter, bool allowed);

    constructor(string memory name_, string memory symbol_, uint8 decimals_, address admin)
        ERC20(name_, symbol_)
    {
        _customDecimals = decimals_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function decimals() public view override returns (uint8) { return _customDecimals; }

    function setMinter(address account, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (allowed) _grantRole(MINTER_ROLE, account);
        else _revokeRole(MINTER_ROLE, account);
        emit MinterUpdated(account, allowed);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) { _mint(to, amount); }
    function burn(address from, uint256 amount) external onlyRole(MINTER_ROLE) { _burn(from, amount); }
}
