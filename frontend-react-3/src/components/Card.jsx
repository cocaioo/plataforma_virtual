import React from 'react';
import { Link } from 'react-router-dom';

const Card = ({ title, to, icon: Icon, inDevelopment }) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-6 text-center flex flex-col h-full">
      <div className="flex-grow">
        {Icon && <Icon className="mx-auto h-12 w-12 text-gray-400" />}
        <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      </div>
      <div className="mt-6">
        {inDevelopment ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
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
