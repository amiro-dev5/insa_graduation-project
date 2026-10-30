import React from 'react';
import { Wrench, Shield, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Wrench size={16} />
              </div>
              <span className="font-bold text-lg tracking-tight text-white">
                Fix<span className="text-indigo-400">It</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              FixIt is Ethiopia's dedicated service marketplace connecting household and commercial clients with licensed, vetted, and rated trade technicians.
            </p>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Shield size={14} className="text-emerald-400" />
              <span>Admin-verified qualifications</span>
            </div>
          </div>

          {/* Core Services */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Popular Services</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/search?category=electrical-repair" className="hover:text-white transition-colors">Electrical Repair & Wiring</Link></li>
              <li><Link to="/search?category=plumbing" className="hover:text-white transition-colors">Plumbing & Leak Solutions</Link></li>
              <li><Link to="/search?category=ceramic-tile-installation" className="hover:text-white transition-colors">Ceramic & Tile Fitting</Link></li>
              <li><Link to="/search?category=carpentry" className="hover:text-white transition-colors">Custom Carpentry & Cabinetry</Link></li>
              <li><Link to="/search?category=appliance-repair" className="hover:text-white transition-colors">Household Appliance Repair</Link></li>
            </ul>
          </div>

          {/* Target Locations */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Service Areas</h4>
            <ul className="space-y-2 text-xs">
              <li><span>Addis Ababa (Bole, Kirkos, Yeka, Arada, Gullele)</span></li>
              <li><span>Hawassa (Menehariya, Tabor)</span></li>
              <li><span>Dire Dawa (Sabian, Kebele 01)</span></li>
              <li><span>Bahir Dar & Adama</span></li>
            </ul>
          </div>

          {/* Platform & Trust */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Marketplace Standards</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center space-x-1.5">
                <CheckCircle size={13} className="text-indigo-400" />
                <span>Mandatory qualification review</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle size={13} className="text-indigo-400" />
                <span>Up to 3 select technician dispatch</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle size={13} className="text-indigo-400" />
                <span>Customer privacy protection</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle size={13} className="text-indigo-400" />
                <span>Verified two-way reviews</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center">
          <p>© {new Date().getFullYear()} FixIt Service Marketplace. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Designed for technician service delivery in Ethiopia.</p>
        </div>
      </div>
    </footer>
  );
};
