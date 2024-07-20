use anchor_lang::prelude::*;

mod instructions;
mod state;
mod errors;
mod constants;

use instructions::*;

declare_id!("uni89rwTPZo2AV5jWCv5Jx4GNDWAqc54BePQKcttmUa");

#[program]
pub mod solana_uniswap_v2 {
    use super::*;

    pub fn initialize_amm(
        ctx: Context<InitializeAmm>, 
        id: Pubkey,
        fee: u16
    ) -> Result<()> {
        ctx.accounts.initialize_amm(id, fee)?;
        Ok(())
    }

    pub fn initialize_pool(
        ctx: Context<InitializePool>
    ) -> Result<()> {
        ctx.accounts.initialize_pool()
    }

    pub fn deposit_liquidity(
        ctx: Context<DepositLiquidity>,
        amount_a: u64,
        amount_b: u64,
    ) -> Result<()> {
        ctx.accounts
            .deposit_liquidity(amount_a, amount_b, &ctx.bumps)
    }

    pub fn withdraw_liquidity(
        ctx: Context<WithdrawLiquidity>,
        amount: u64
    ) -> Result<()> {
        ctx.accounts.withdraw_liquidity(amount, &ctx.bumps)
    }
    
    pub fn swap(
        ctx: Context<Swap>,
        swap_a: bool,
        input_amount: u64,
        min_result_amount: u64,
    ) -> Result<()> {
        ctx.accounts
            .swap(swap_a, input_amount, min_result_amount, &ctx.bumps)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
