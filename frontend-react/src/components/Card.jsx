import React from 'react';
import { Link } from 'react-router-dom';

const Card = ({ title, to, icon: Icon, inDevelopment, className = '' }) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 shadow-md rounded-lg p-6 text-center flex flex-col h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${className}`}
    >
      <div className="flex-grow">
        {Icon && (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
            <Icon className="h-7 w-7 text-blue-600 dark:text-blue-300 float-soft" />
          </div>
        )}
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="mt-6">
        {inDevelopment ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
            Em desenvolvimento
          </span>
        ) : (
          <Link
            to={to}
            className="w-full inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-200"
          >
            Acessar
          </Link>
        )}
      </div>
    </div>
  );
};

export default Card;
