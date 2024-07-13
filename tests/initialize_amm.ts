import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { SolanaUniswapV2 } from "../target/types/solana_uniswap_v2";
import { expect } from "chai";
import { expectRevert } from "./utils";

describe("solana-uniswap-v2", () => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection;
  anchor.setProvider(provider);


  const program = anchor.workspace.SolanaUniswapV2 as Program<SolanaUniswapV2>;

  describe("Initalize AMM", () => {
    let id: PublicKey;
    let fee: number;
    let admin: Keypair;

    before(() => {
      id = Keypair.generate().publicKey;
      fee = 500;
      admin = Keypair.generate();
    });

    it("Airdropping tokens to auth and payer", async () => {
      const tx_maker = await provider.connection.requestAirdrop(
        admin.publicKey,
        anchor.web3.LAMPORTS_PER_SOL * 10
      );
      await provider.connection.confirmTransaction(tx_maker);
      const tx_taker = await provider.connection.requestAirdrop(
        id,
        anchor.web3.LAMPORTS_PER_SOL * 10
      );
      await provider.connection.confirmTransaction(tx_taker);
    });

    it("Initalizing AMM", async () => {
      const ammKey = PublicKey.findProgramAddressSync(
        [id.toBuffer()],
        program.programId
      )[0];
      await program.methods
        .initializeAmm(id, fee)
        .accounts({ amm: ammKey, admin: admin.publicKey })
        .rpc();

      const ammAccount = await program.account.amm.fetch(ammKey);
      expect(ammAccount.id.toString()).to.equal(id.toString());
      expect(ammAccount.admin.toString()).to.equal(admin.publicKey.toString());
      expect(ammAccount.fee.toString()).to.equal(fee.toString());
    });

    it("Invalid fee amount", async () => {
      fee = 10000;
      const ammKey = PublicKey.findProgramAddressSync(
        [id.toBuffer()],
        program.programId
      )[0];
      await expectRevert(
        program.methods
          .createAmm(id, fee)
          .accounts({ amm: ammKey, admin: admin.publicKey })
          .rpc()
      );
    });
  });
});
