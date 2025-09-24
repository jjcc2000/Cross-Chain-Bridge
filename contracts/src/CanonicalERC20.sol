// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CanonicalERC20
 * @notice The ORIGINAL token on the source chain that your Vault locks.
 * - Owner can mint/burn (you can later hand ownership to a multisig, etc.)
 * - Decimals are configurable at deploy time.
 */
contract CanonicalERC20 is ERC20, Ownable {
    uint8 private immutable _customDecimals;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address initialOwner,
        uint256 initialSupply // in "decimals_" units
    ) ERC20(name_, symbol_) Ownable(initialOwner) {
        _customDecimals = decimals_;
        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply);
        }
    }

    function decimals() public view override returns (uint8) {
        return _customDecimals;
    }

    /** ---------------- Admin mint/burn ---------------- */

    /// @notice Mint new tokens to `to`. Only owner.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Burn tokens from `from`. Only owner (requires prior allowance if from != owner).
    function burnFrom(address from, uint256 amount) external onlyOwner {
        _spendAllowance(from, _msgSender(), amount);
        _burn(from, amount);
    }

    /// @notice Burn tokens from owner’s balance. Only owner.
    function burn(uint256 amount) external onlyOwner {
        _burn(_msgSender(), amount);
    }
}
