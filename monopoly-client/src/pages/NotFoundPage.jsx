import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-emerald-50 p-4'>
      <div className='max-w-lg text-center space-y-6 bg-white p-8 rounded-2xl shadow-2xl border border-emerald-100'>
        <div className='space-y-4'>
          <h1 className='text-9xl font-bold text-emerald-600 animate-pulse'>404</h1>
          <h2 className='text-3xl font-semibold text-neutral-600'>
            Ой! Страница потерялась
          </h2>
          <p className='text-lg text-neutral-500'>
            Кажется, мы не можем найти то, что вы ищете. Возможно, адрес был введен неправильно 
            или страница перемещена.
          </p>
        </div>
        
        <Link
          to='/'
          className='inline-block px-8 py-3 bg-emerald-500 text-white rounded-xl
                    hover:bg-emerald-600 active:bg-emerald-700 transition-colors
                    font-semibold text-lg shadow-md hover:shadow-lg'
        >
          Вернуться на главную
        </Link>
      </div>
      
      <div className='mt-8 text-center text-neutral-500'>
        <p>Пока вы здесь... Хотите сыграть в Монополию? 🎲</p>
      </div>
    </div>
  )
}