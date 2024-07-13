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

    pub fn initialize_amm(ctx: Context<InitializeAmm>, id: Pubkey, fee: u16) -> Result<()> {
        ctx.accounts.initialize_amm(id, fee)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
