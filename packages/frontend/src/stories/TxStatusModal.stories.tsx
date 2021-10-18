import React from 'react'
import { ComponentStory, ComponentMeta } from '@storybook/react'
import TxStatusModal from 'src/components/txStatus/TxStatusModal'
import { storyTransactions } from './data'
import Transaction from 'src/models/Transaction'

export default {
  title: 'components/TxStatusModal',
  component: TxStatusModal,
} as ComponentMeta<typeof TxStatusModal>

const Template: ComponentStory<typeof TxStatusModal> = args => {
  function handleClose() {
    console.log('close')
  }

  const tx = storyTransactions[0]

  return <TxStatusModal onClose={handleClose} tx={tx as Transaction} {...args} />
}

export const Basic = Template.bind({})
Basic.args = {}