use anchor_lang::prelude::*;

use crate::{errors::*, state::Amm};

impl<'info> InitializeAmm<'info> {
    pub fn initialize_amm(&mut self, id: Pubkey, fee: u16) -> Result<()> {
        let amm = &mut self.amm;
        amm.id = id;
        amm.admin = self.admin.key();
        amm.fee = fee;

        Ok(())
    }
}
#[derive(Accounts)]
#[instruction(id: Pubkey, fee: u16)]
pub struct InitializeAmm<'info> {
    #[account(
        init,
        payer = payer,
        space = Amm::LEN,
        seeds = [
            id.as_ref()
        ],
        bump,
        constraint = fee < 10000 @ CustomError::InvalidFee,
    )]
    pub amm: Account<'info, Amm>,

    /// CHECK: Read only, delegatable creation
    pub admin: AccountInfo<'info>,

    /// Payer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Solana accounts
    pub system_program: Program<'info, System>,
}
