import React, { ChangeEvent, FormEvent, useState, useEffect } from 'react'
import * as anchor from '@coral-xyz/anchor'
import { PublicKey, Transaction } from '@solana/web3.js'
import {
  useWallet,
  useConnection,
  AnchorWallet,
} from '@solana/wallet-adapter-react'
import { OrderParams } from '@openbook-dex/openbook/lib/market'
import { useMarketContext } from '../../contexts/market'
import { useAccountsContext } from '../../contexts/accounts'
import { CalculatorIcon } from '@heroicons/react/outline'
import { Button, ButtonSize } from '../atoms/Button'
import { Label } from '../atoms/Label'
import { Input } from '../atoms/Input'
import { getAssociatedTokenAccount } from '../../utils/getAssociatedTokenAccount'
import clsx from 'clsx'
import idl from '../../utils/openbook_dca.json'

export const PositionForm = () => {
  const wallet = useWallet()
  const { connection } = useConnection()
  const { market, placeOrder, currentPrice } = useMarketContext()
  // const { getAccount } = useAccountsContext()
  const [side, setSide] = useState<string>('buy')
  const [baseCurrency, setBaseCurrency] = useState<string | number>(0)
  const [quoteCurrency, setQuoteCurrency] = useState<string | number>(0)
  const [orderType, setOrderType] = useState<string>('limit')

  const handleBaseCurrencyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setBaseCurrency(e.target.value)
  }

  const handleQuoteCurrencyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuoteCurrency(e.target.value)
  }

  // const handleOrderTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
  //   setOrderType(e.target.value)
  // }

  const handleLimitOrder = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!wallet.publicKey) {
      return
    }

    // Get associated token account for quote token
    const quoteToken = await getAssociatedTokenAccount(
      market.quoteMintAddress,
      wallet.publicKey,
      wallet,
      connection
    )

    // Determine payer
    const payer = side === 'buy' ? quoteToken?.address : quoteToken?.owner

    // Place order transaction
    const order = await market.makePlaceOrderTransaction(connection, {
      owner: wallet.publicKey,
      payer: payer!,
      side: side as 'buy' | 'sell', // 'buy' or 'sell'
      price: Number(quoteCurrency),
      size: Number(baseCurrency),
      orderType: orderType as 'limit' | 'ioc' | 'postOnly' | undefined, // 'limit', 'ioc', 'postOnly',
    })

    // Build transaction
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash()

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: wallet.publicKey,
    })

    transaction.add(order.transaction)

    // Send transaction
    try {
      await wallet.sendTransaction(transaction, connection, {
        signers: order.signers,
      })
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <form
      className="flex flex-col w-1/4 border-b border-zinc-800"
      onSubmit={handleLimitOrder}
    >
      <div className="flex items-center px-4 h-16 border-b border-zinc-800">
        <Button
          type="button"
          size={ButtonSize.sm}
          className="border mr-2 leading-none hover:bg-white hover:text-zinc-900"
        >
          Cross
        </Button>
        <Button
          type="button"
          size={ButtonSize.sm}
          className="border leading-none hover:bg-white hover:text-zinc-900"
        >
          5.00x
        </Button>
        <CalculatorIcon className="ml-auto h-6 w-6 text-zinc-400" />
      </div>

      <div className="flex text-sm font-medium text-zinc-400">
        <div
          className={clsx(
            'flex items-center justify-center w-1/2 border-b border-zinc-800 h-10 cursor-pointer',
            {
              'border-b-2 text-emerald-500 border-emerald-500': side === 'buy',
            }
          )}
          onClick={() => setSide('buy')}
        >
          Buy SOL/USDC
        </div>
        <div
          className={clsx(
            'flex items-center justify-center w-1/2 border-b border-zinc-800 h-10 cursor-pointer',
            {
              'border-b-2 text-red-500 border-red-500': side === 'sell',
            }
          )}
          onClick={() => setSide('sell')}
        >
          Sell SOL/USDC
        </div>
      </div>
      <fieldset>
        <div className="flex flex-col p-4 pb-2">
          <Label htmlFor="baseCurrencyInput" className="mb-2 text-zinc-400">
            Quantity (SOL)
          </Label>
          <input
            type="text"
            id="baseCurrencyInput"
            onChange={handleBaseCurrencyChange}
            value={baseCurrency}
            className={clsx(
              'form-input',
              'p-3',
              'text-sm',
              'bg-zinc-800',
              'rounded-lg',
              'font-semibold',
              'border-zinc-700'
            )}
          />
        </div>

        <div className="flex flex-col p-4">
          <Label htmlFor="quoteCurrencyInput" className="mb-2 text-zinc-400">
            Price (USDC)
          </Label>
          <input
            type="text"
            id="quoteCurrencyInput"
            onChange={handleQuoteCurrencyChange}
            value={quoteCurrency}
            className={clsx(
              'form-input',
              'p-3',
              'text-sm',
              'bg-zinc-800',
              'rounded-lg',
              'font-semibold',
              'border-zinc-700'
            )}
          />
        </div>

        <div className="flex space-x-4 p-4 pt-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="postOnly"
              className="form-checkbox rounded-sm"
              checked={orderType === 'postOnly'}
              onChange={() =>
                orderType === 'postOnly'
                  ? setOrderType('limit')
                  : setOrderType('postOnly')
              }
            />
            <Label htmlFor="postOnly" className="text-zinc-400">
              Post
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ioc"
              className="form-checkbox rounded-sm"
              checked={orderType === 'ioc'}
              onChange={() =>
                orderType === 'ioc'
                  ? setOrderType('limit')
                  : setOrderType('ioc')
              }
            />
            <Label htmlFor="ioc" className="text-zinc-400">
              IOC
            </Label>
          </div>
        </div>
      </fieldset>

      <div className="flex px-4 py-2">
        {side === 'buy' ? (
          <Button
            size={ButtonSize.lg}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            Buy SOL
          </Button>
        ) : (
          <Button
            size={ButtonSize.lg}
            className="w-full bg-red-500 hover:bg-red-600 text-white"
          >
            Sell SOL
          </Button>
        )}
      </div>
    </form>
  )
}
