import {
  http,
  toHex,
  fromHex,
  getContract,
  encodePacked,
  type Address,
  createPublicClient
} from 'viem'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { useChainId, useChains, useSwitchChain, useWalletClient } from 'wagmi'

import { useCart } from '#/contexts/cart-context'
import { Step } from '#/components/checkout/types'
import type { ChainWithDetails } from '#/lib/wagmi'
import { DEFAULT_CHAIN } from '#/lib/constants/chain'
import { useMintEFP } from './efp-actions/use-mint-efp'
import { useEFPProfile } from '#/contexts/efp-profile-context'
import { efpListRecordsAbi, efpListRegistryAbi } from '#/lib/abi'
import { extractAddressAndTag, isTagListOp } from '#/utils/list-ops'
import { coreEfpContracts, ListRecordContracts } from '#/lib/constants/contracts'
import { EFPActionType, useActions, type Action } from '#/contexts/actions-context'

const useCheckout = () => {
  const {
    actions,
    addActions,
    resetActions,
    moveToNextAction,
    currentActionIndex,
    executeActionByIndex
  } = useActions()
  const chains = useChains()
  const router = useRouter()
  const currentChainId = useChainId()
  const queryClient = useQueryClient()
  const { switchChain } = useSwitchChain()
  const { data: walletClient } = useWalletClient()
  const { totalCartItems, cartItems, resetCart } = useCart()
  const { mint, nonce: mintNonce, listHasBeenMinted } = useMintEFP()
  const { profile, refetchFollowing, refetchProfile, selectedList, refetchLists } = useEFPProfile()

  // get contract for selected chain to pull list storage location from
  const listRegistryContract = getContract({
    address: coreEfpContracts.EFPListRegistry,
    abi: efpListRegistryAbi,
    client: createPublicClient({ chain: DEFAULT_CHAIN, transport: http() })
  })

  // Set step to initiating transactions if the user has already created their EFP list
  // Selecting the chain is only an option when creating a new EFP list to select List records location
  const [currentStep, setCurrentStep] = useState(
    selectedList ? Step.InitiateTransactions : Step.SelectChain
  )

  const [selectedChainId, setSelectedChainId] = useState<number>(DEFAULT_CHAIN.id)
  const selectedChain = chains.find(chain => chain.id === selectedChainId) as ChainWithDetails

  const listOpTx = useCallback(async () => {
    // Get list storage location via token ID
    const listStorageLocation = selectedList
      ? await listRegistryContract.read.getListStorageLocation([BigInt(selectedList)])
      : null

    // Get slot, chain, and List Records contract from storage location or use options from the mint
    const chainId = listStorageLocation
      ? fromHex(`0x${listStorageLocation.slice(64, 70)}`, 'number')
      : selectedChain?.id
    const fetchedChain = chains.find(chain => chain.id === chainId)

    const nonce = listStorageLocation ? BigInt(`0x${listStorageLocation.slice(-64)}`) : mintNonce
    const ListRecordsContract = listStorageLocation
      ? (`0x${listStorageLocation.slice(70, 110)}` as Address)
      : selectedChainId
        ? (ListRecordContracts[selectedChainId] as Address)
        : coreEfpContracts.EFPListRecords

    // format list operations
    const operations = cartItems.map(item => {
      // append mandatory types and data
      const types = ['uint8', 'uint8', 'uint8', 'uint8', 'address']
      const data: (string | number)[] = [item.listOp.version, item.listOp.opcode, 1, 1]

      if (item.listOp.opcode > 2 && isTagListOp(item.listOp)) {
        // add 'bytes' type for the tag and address and tag to data
        const addrrAndTag = extractAddressAndTag(item.listOp)
        types.push('bytes')
        data.push(...[addrrAndTag.address, toHex(addrrAndTag.tag)])
      } else {
        // add address to data
        data.push(`0x${item.listOp.data.toString('hex')}`)
      }

      // return encoded data into a single HEX string
      return encodePacked(types, data)
    })

    // initiate  'applyListOps' transaction
    const hash = await walletClient?.writeContract({
      chain: fetchedChain,
      address: ListRecordsContract,
      abi: efpListRecordsAbi,
      functionName: 'applyListOps',
      args: [nonce, operations]
    })

    // return transaction hash to enable following transaction status in transaction details component
    return hash
  }, [walletClient, selectedChain, selectedList])

  const setActions = useCallback(async () => {
    // getting the chain ID where the list operations will be performed (selected chain ID if EFP list minted before)
    const chainId = selectedList
      ? fromHex(
          `0x${(
            await listRegistryContract.read.getListStorageLocation([BigInt(selectedList)])
          ).slice(64, 70)}`,
          'number'
        )
      : selectedChain?.id

    if (!chainId) return

    // Prepare and set actions when selectedChain is updated and not null
    const cartItemAction: Action = {
      id: EFPActionType.UpdateEFPList, // Unique identifier for the action
      type: EFPActionType.UpdateEFPList,
      label: `${totalCartItems} List ops`,
      chainId,
      execute: listOpTx,
      isPendingConfirmation: false
    }

    const createEFPListAction: Action = {
      id: EFPActionType.CreateEFPList, // Unique identifier for the action
      type: EFPActionType.CreateEFPList,
      label: 'create list',
      chainId: DEFAULT_CHAIN.id, // Chain ID where main contracts are stored at
      execute: async () => await mint(selectedChainId),
      isPendingConfirmation: false
    }

    // add Create list action if user doesn't have the EFP list yet
    const actionsToExecute =
      selectedList || listHasBeenMinted ? [cartItemAction] : [createEFPListAction, cartItemAction]
    addActions(actionsToExecute)
  }, [selectedChainId, totalCartItems, listOpTx])

  useEffect(() => {
    setActions()
  }, [setActions])

  // Handle selecting a chain
  const handleChainClick = useCallback((chainId: number) => {
    setSelectedChainId(chainId)
  }, [])

  // Move to the next step
  const handleNextStep = useCallback(() => {
    if (!selectedChain) return
    setCurrentStep(Step.InitiateTransactions)
  }, [selectedChain])

  const getRequiredChain = useCallback(
    async (index: number) =>
      actions[index || 0]?.label === 'create list'
        ? DEFAULT_CHAIN.id
        : selectedList
          ? fromHex(
              `0x${(
                await listRegistryContract.read.getListStorageLocation([BigInt(selectedList)])
              ).slice(64, 70)}`,
              'number'
            )
          : selectedChainId,
    [actions, listRegistryContract, profile, selectedChainId]
  )

  // Handle action initiation
  const handleInitiateActions = useCallback(async () => {
    const chainId = await getRequiredChain(currentActionIndex)
    if (!chainId) return
    if (currentChainId !== chainId) {
      switchChain({ chainId })
      return
    }

    setCurrentStep(Step.TransactionStatus)
    executeActionByIndex(currentActionIndex || 0)
  }, [executeActionByIndex, currentChainId, getRequiredChain])

  const handleNextAction = useCallback(async () => {
    const chainId = await getRequiredChain(currentActionIndex + 1)
    if (!chainId) return
    if (currentChainId !== chainId) {
      switchChain(
        { chainId },
        {
          onSettled: () => {
            setCurrentStep(Step.InitiateTransactions)
            // const nextActionIndex = moveToNextAction()
            // executeActionByIndex(nextActionIndex)
          }
        }
      )
      return
    }

    const nextActionIndex = moveToNextAction()
    executeActionByIndex(nextActionIndex)
  }, [moveToNextAction, executeActionByIndex, getRequiredChain, currentChainId, currentActionIndex])

  const onFinish = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['follow state'] })

    resetCart()
    resetActions()

    if (selectedList === undefined) refetchLists()
    else {
      refetchProfile()
      refetchFollowing()
    }

    router.push('/profile')
  }, [resetActions, resetCart])

  return {
    chains,
    actions,
    onFinish,
    currentStep,
    setCurrentStep,
    selectedChain,
    selectedChainId,
    setSelectedChainId,
    handleChainClick,
    handleNextStep,
    handleInitiateActions,
    handleNextAction
  }
}

export default useCheckout
