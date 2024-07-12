use anchor_lang::prelude::*;

declare_id!("4LmrjU56UvHCMqKscEGgvqDhGcm32KnRjkPcsV7BYJM5");

#[program]
pub mod solana_uniswap_v2 {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
