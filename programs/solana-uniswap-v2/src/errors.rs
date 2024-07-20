use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("Invalid fee amount")]
    InvalidFee,

    #[msg("Invalid token mint is provided for the pool")]
    InvalidTokenMint,

    #[msg("Deposit amount is below the minimum required liquidity")]
    InsufficientDepositAmount,

    #[msg("Result is below the minimum expected")]
    SwapResultUnderflow,

    #[msg("Invariant check failed")]
    InvariantError,
}
