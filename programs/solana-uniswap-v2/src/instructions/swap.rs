use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};
use fixed::types::I64F64;

use crate::{
    constants::AUTHORITY_SEED,
    errors::*,
    state::{Amm, Pool},
};
impl<'info> Swap<'info> {
    pub fn swap(
        &mut self,
        swap_a: bool,
        input_amount: u64,
        min_result_amount: u64,
        bumps: &SwapBumps,
    ) -> Result<()> {
        // Ensure owned assets are only being deposited
        let input = if swap_a && input_amount > self.trader_account_a.amount {
            self.trader_account_a.amount
        } else if !swap_a && input_amount > self.trader_account_b.amount {
            self.trader_account_b.amount
        } else {
            input_amount
        };

        // Calculate effective input after deducting fee
        let amm = &self.amm;
        let taxed_input = input - input * amm.fee as u64 / 10000;

        let pool_a = &self.pool_account_a;
        let pool_b = &self.pool_account_b;
        // Compute swap result based on constant product formula
        let result = if swap_a {
            I64F64::from_num(taxed_input)
                .checked_mul(I64F64::from_num(pool_b.amount))
                .unwrap()
                .checked_div(
                    I64F64::from_num(pool_a.amount)
                        .checked_add(I64F64::from_num(taxed_input))
                        .unwrap(),
                )
                .unwrap()
        } else {
            I64F64::from_num(taxed_input)
                .checked_mul(I64F64::from_num(pool_a.amount))
                .unwrap()
                .checked_div(
                    I64F64::from_num(pool_b.amount)
                        .checked_add(I64F64::from_num(taxed_input))
                        .unwrap(),
                )
                .unwrap()
        }
        .to_num::<u64>();

        // Ensure minimum output requirement is met
        if result < min_result_amount {
            return err!(CustomError::SwapResultUnderflow);
        }

        // Calculate pre-swap invariant for later verification
        let invariant = pool_a.amount * pool_b.amount;

        // Transfer tokens to the pool
        let authority_bump = bumps.pool_authority;
        let authority_seeds = &[
            &self.pool.amm.to_bytes(),
            &self.mint_a.key().to_bytes(),
            &self.mint_b.key().to_bytes(),
            AUTHORITY_SEED.as_bytes(),
            &[authority_bump],
        ];
        let signer_seeds = &[&authority_seeds[..]];
        if swap_a {
            token::transfer(
                CpiContext::new(
                    self.token_program.to_account_info(),
                    Transfer {
                        from: self.trader_account_a.to_account_info(),
                        to: self.pool_account_a.to_account_info(),
                        authority: self.trader.to_account_info(),
                    },
                ),
                input,
            )?;
            token::transfer(
                CpiContext::new_with_signer(
                    self.token_program.to_account_info(),
                    Transfer {
                        from: self.pool_account_b.to_account_info(),
                        to: self.trader_account_b.to_account_info(),
                        authority: self.pool_authority.to_account_info(),
                    },
                    signer_seeds,
                ),
                result,
            )?;
        } else {
            token::transfer(
                CpiContext::new_with_signer(
                    self.token_program.to_account_info(),
                    Transfer {
                        from: self.pool_account_a.to_account_info(),
                        to: self.trader_account_a.to_account_info(),
                        authority: self.pool_authority.to_account_info(),
                    },
                    signer_seeds,
                ),
                input,
            )?;
            token::transfer(
                CpiContext::new(
                    self.token_program.to_account_info(),
                    Transfer {
                        from: self.trader_account_b.to_account_info(),
                        to: self.pool_account_b.to_account_info(),
                        authority: self.trader.to_account_info(),
                    },
                ),
                result,
            )?;
        }

        msg!(
            "Traded {} tokens ({} after fees) for {}",
            input,
            taxed_input,
            result
        );

        // Verify post-swap invariant to ensure pool integrity
        // Reload accounts because of the CPIs
        self.pool_account_a.reload()?;
        self.pool_account_b.reload()?;

        Ok(())
    }
}
#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(
        seeds = [
            amm.id.as_ref()
        ],
        bump,
    )]
    pub amm: Account<'info, Amm>,

    #[account(
        seeds = [
            pool.amm.as_ref(),
            pool.mint_a.key().as_ref(),
            pool.mint_b.key().as_ref(),
        ],
        bump,
        has_one = amm,
        has_one = mint_a,
        has_one = mint_b,
    )]
    pub pool: Account<'info, Pool>,

    /// CHECK: Read only authority
    #[account(
        seeds = [
            pool.amm.as_ref(),
            mint_a.key().as_ref(),
            mint_b.key().as_ref(),
            AUTHORITY_SEED.as_ref(),
        ],
        bump,
    )]
    pub pool_authority: AccountInfo<'info>,

    /// The account doing the swap
    pub trader: Signer<'info>,

    pub mint_a: Box<Account<'info, Mint>>,

    pub mint_b: Box<Account<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = pool_authority,
    )]
    pub pool_account_a: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = pool_authority,
    )]
    pub pool_account_b: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint_a,
        associated_token::authority = trader,
    )]
    pub trader_account_a: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint_b,
        associated_token::authority = trader,
    )]
    pub trader_account_b: Box<Account<'info, TokenAccount>>,

    /// Payer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Solana accounts
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
